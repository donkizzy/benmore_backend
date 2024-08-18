const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const bucket = require("../../config/firebaseConfig");
const Post = require("../models/Post");

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      username,
      email,
      password,
    });

    // Set default profile_picture as "" in model
    user.profile_picture = "";

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save the user to the database
    await user.save();

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "365d" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          message: "Your registration was successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
          },
          token: token,
        });
      }
    );
  } catch (err) {
    res.status(400).send({ message: "An error occurred" });
  }
};

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Incorrect Username Or Password
 */
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
      return res
        .status(400)
        .json({ message: "Incorrect Username Or Password" });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Incorrect Username Or Password" });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "365d" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
          },
          token: token,
        });
      }
    );
  } catch (err) {
    res.status(400).send({ message: "An error occurred" });
  }
};

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Bad request
 */
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

/**
 * @swagger
 * /users/update:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized to update this profile
 */
exports.updateUser = async (req, res) => {
  try {
    const newUserData = req.body;
    const authenticatedUserId = req.user.id;
    const user = req.user;

    if (user._id.toString() !== authenticatedUserId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this profile" });
    }

    const file = req.file;

    let downloadURL = user.image_url;

    if (file) {
      const filePath = `users/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(filePath);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on("error", (error) => {
        return res.status(500).json({ message: "Server error", error });
      });

      await new Promise((resolve, reject) => {
        blobStream.on("finish", async () => {
          await fileUpload.makePublic();

          downloadURL = fileUpload.publicUrl();
          resolve();
        });
        blobStream.end(file.buffer);
      });
    }

    // Update user fields
    const allowedFields = ["username", "email", "profile_picture"];
    Object.keys(newUserData).forEach((key) => {
      if (allowedFields.includes(key)) {
        user[key] = newUserData[key];
      }
    });

    user.profile_picture = downloadURL;

    await user.save();

    const response = {
      message: "User updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_picture: downloadURL,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: "Server error", error });
  }
};

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Bad request
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID and delete
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send a response back to the client
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).send({ message: "An error occurred" });
  }
};

/**
 * @swagger
 * /users/requestPasswordReset:
 *   post:
 *     summary: Request a password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: User not found
 *       500:
 *         description: Error sending email
 */
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL,
      subject: "Password Reset",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please click on the following link, or paste this into your browser to complete the process:\n\n
               http://${req.headers.host}/reset/${resetToken}\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error sending email", error: err });
      }
      res.status(200).json({ message: "Password reset email sent" });
    });
  } catch (err) {
    res.status(400).send("Server Error");
  }
};

/**
 * @swagger
 * /users/resetPassword:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(400).send({ message: "Server Error" });
  }
};

/**
 * @swagger
 * /users/{id}/toggleFollow:
 *   post:
 *     summary: Toggle follow/unfollow a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The target user ID
 *     responses:
 *       200:
 *         description: User followed/unfollowed successfully
 *       400:
 *         description: You cannot follow yourself or Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
exports.toggleFollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const user = req.user;
    const targetUser = await User.findById(targetUserId);

    if (user.id === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    if (!user || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = user.following.map((followingUser) =>
      followingUser._id.toString()
    );
    const isFollowing = followingIds.includes(targetUserId);

    if (isFollowing) {
      // Unfollow the user
      user.following = user.following.filter(
        (followingUser) => followingUser._id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        (follower) => follower.toString() !== user.id
      );
    } else {
      // Follow the user
      user.following.push({ _id: targetUserId });
      targetUser.followers.push(user.id);
    }

    await user.save();
    await targetUser.save();

    const response = {
      message: isFollowing
        ? "User unfollowed successfully"
        : "User followed successfully",
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        profile_picture: targetUser.profile_picture,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({ message: "Server error", error });
  }
};
