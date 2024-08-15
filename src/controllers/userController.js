const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');



exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

    try {
  
      // Check if user already exists
      let user = await User.findOne({ email });
      let name = await User.findOne({ username });
      if (user || name) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Create a new user instance
      user = new User({
        username,
        email,
        password
      });
  
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
  
      // Save the user to the database
      await user.save();
  
      // Generate JWT token
      const payload = {
        user: {
          id: user.id
        }
      };
  
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '365d' },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({ 
            "message": "Your registration was successful",
            "user":  {
              id: user.id,
              username: user.username,
              email: user.email,
              profile_picture: user.profile_picture,
              followers: user.followers,
              post: user.posts,
            },
            "token": token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(400).send({"message":'An error occurred'});
    }
};


exports.login = async (req, res) => {

   const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Incorrect Username Or Password' });
    }
    
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect Username Or Password' });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '365d' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ 
          message: "Login successful",
          "user": {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
            followers: user.followers,
            post: user.posts,
          },
          token: token 
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(400).send({"message":'An error occurred'});
  }
};

exports.getUser = async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
      .populate('following', 'username email profile_picture')
      .populate('followers', 'username email profile_picture');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({
        "user": {
          id: user.id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture,
          followers: user.followers,
          following: user.following,
          posts: user.posts,
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(400).send({"message":'An error occurred'});
    }
};

exports.updateUser = async (req, res) => {
    try {
      const userId = req.params.id;
      const newUserData = req.body;
  
      // Find the user by ID and update the user data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update user fields
      Object.keys(newUserData).forEach(key => {
        user[key] = newUserData[key];
      });
  
      // Save the updated user data to the database
      await user.save();
  
      // Send a response back to the client
      res.status(200).json({ message: 'User updated successfully',  "user": user, });
    } catch (error) {
      res.status(400).json({ message: 'Server error', error });
    }
};

exports.deleteUser = async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Find the user by ID and delete
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Send a response back to the client
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).send({"message":'An error occurred'});
    }
};

exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour
  
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();
  
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD
        }
      });
  
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please click on the following link, or paste this into your browser to complete the process:\n\n
               http://${req.headers.host}/reset/${resetToken}\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
  
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email:', err);
          return res.status(500).json({ message: 'Error sending email' });
        }
        res.status(200).json({ message: 'Password reset email sent' });
      });
    } catch (err) {
      console.error(err.message);
      res.status(400).send('Server Error');
    }
};
  
 exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
  
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();
  
      res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
      console.error(err.message);
      res.status(400).send('Server Error');
    }
};

exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.user.id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (currentUser.following.includes(userToFollow._id)) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    // Add userToFollow to currentUser's following list
    currentUser.following.push(userToFollow._id);
    await currentUser.save();

    // Add currentUser to userToFollow's followers list
    userToFollow.followers.push(currentUser._id);
    await userToFollow.save();

    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.user.id);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentUser.following.includes(userToUnfollow._id)) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    // Remove userToUnfollow from currentUser's following list
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );
    await currentUser.save();

    // Remove currentUser from userToUnfollow's followers list
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );
    await userToUnfollow.save();

    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};