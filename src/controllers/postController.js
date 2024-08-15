const Post = require('../models/Post');
const mongoose = require('mongoose');
const User = require('../models/User');

exports.createPost = async (req, res) => {
  try {
    // Extract data from the request body
    const { title, description,image_url } = req.body;
    const assignedToObjectId = mongoose.isValidObjectId(req.user.id) ? req.user.id : new mongoose.Types.ObjectId();


    // Create a new post instance
    const newPost = new Post({
      title,
      description,
      image_url,
      assigned_to: assignedToObjectId,
      createdAt: new Date(),
    });

    // Save the post to the database
    const savedPost = await newPost.save();

    const user = await User.findById(req.user.user.id)

    // Send a response back to the client
    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: savedPost._id,
        title: savedPost.title,
        description: savedPost.description,
        image_url: savedPost.image_url,
        likes: savedPost.likes,
        assigned_to: {
          id:  user.id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture,
          followers: user.followers,
        },
        createdAt: savedPost.created_at,
        comments: savedPost.comments,
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({
      message: 'An error occurred while creating the post'
    });
  }
};

exports.getPost = async (req, res) => {
  // Get post logic
};

exports.updatePost = async (req, res) => {
  // Update post logic
};

exports.deletePost = async (req, res) => {
  // Delete post logic
};