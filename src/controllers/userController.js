const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const bucket = require('../../config/firebaseConfig');
const Post = require('../models/Post');


exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

    try {
  
      // Check if user already exists
      let user = await User.findOne({ $or: [{ email }, { username }] });
      if (user) {
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
            },
            "token": token });
        }
      );
    } catch (err) {
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
    let user = await User.findOne({ email }).populate('following', 'username email profile_picture').populate('followers', 'username email profile_picture');

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
          },
          token: token 
        });
      }
    );
  } catch (err) {
    res.status(400).send({"message":'An error occurred'});
  }
};

exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .populate('following', 'username email profile_picture')
      .populate('followers', 'username email profile_picture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userPosts = await Post.find({ likedBy: userId });
    const totalLikesGiven = userPosts.length;
    

    user.profileViews = (user.profileViews || 0) + 1;
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      profile_picture: user.profile_picture,
      totalLikesGiven,
      totalFollowers: user.followers.length,
      profileViews: user.profileViews,
    });
  } catch (error) {
    res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const newUserData = req.body;
    const authenticatedUserId = req.user.id; 
    const user = req.user;

    if (user.id !== authenticatedUserId) {
      return res.status(403).json({ message: 'You are not authorized to update this profile' });
    }


    const file = req.file;

    let downloadURL = user.image_url; 

    if (file) {
      const filePath = `users/{Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(filePath);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype
        }
      });

      blobStream.on('error', (error) => {
        return res.status(500).json({ message: 'Server error', error });
      });

      await new Promise((resolve, reject) => {
        blobStream.on('finish',async () => {

          await fileUpload.makePublic();

          downloadURL = fileUpload.publicUrl();
          resolve();
        });
        blobStream.end(file.buffer);
      });
    }

    // Update user fields
    const allowedFields = ['username', 'email', 'profile_picture'];
    Object.keys(newUserData).forEach(key => {
      if (allowedFields.includes(key)) {
        user[key] = newUserData[key];
      }
    });
    
    user.image_url = downloadURL;

    await user.save();

    
    const response = {
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_picture: user.image_url,
      }
    };

    res.status(200).json(response);
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
          return res.status(500).json({ message: 'Error sending email' });
        }
        res.status(200).json({ message: 'Password reset email sent' });
      });
    } catch (err) {
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
      res.status(400).send('Server Error');
    }
};

exports.toggleFollowUser = async (req, res) => {
  try {

    const targetUserId = req.params.id;

    // Find both users
    const user = req.user;
    const targetUser = await User.findById(targetUserId);

    if (user.id === targetUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    if (!user || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = user.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow the user
      user.following = user.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== user.id);
    } else {
      // Follow the user
      user.following.push(targetUserId);
      targetUser.followers.push(user.id);
    }

    await user.save();
    await targetUser.save();

    const populatedUser = await User.findById(user.id).populate('following', 'username email profile_picture');

    const response = {
      message: isFollowing ? 'User unfollowed successfully' : 'User followed successfully',
      user: {
        id:  populatedUser.id,
        username: populatedUser.username,
        email: populatedUser.email,
        profile_picture: populatedUser.profile_picture,
        following: populatedUser.following.map(follower => ({
          id: follower._id,
          username: follower.username,
          email: follower.email
        })),
      }
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({ message: 'Server error', error });
  }
};

