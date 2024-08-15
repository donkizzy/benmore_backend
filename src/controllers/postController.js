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
  try {
      const postId = req.params.id; 
      const post = await Post.findById(postId); 
      const user = await User.findById(req.user.user.id)

      if (!post) {
          return res.status(404).json({ message: 'Post not found' });
      }

      res.status(200).json({
        message: 'Post retrieved successfully',
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
      }); // Send the post data as a response
  } catch (error) {
      res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const updatedData = req.body; 
    const user = await User.findById(req.user.user.id)


     // Check if the logged-in user is the creator of the post
     if (updatedData.assigned_to.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this post' });
    }



    const updatedPost = await Post.findByIdAndUpdate(postId, updatedData, { new: true }); // Find and update the post

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({
      message: 'Post updated successfully',
      post: updatedPost,
      user: {
        id: user.assigned_to,
        username: user.assigned_to.username,
        email: user.assigned_to.email,
        profile_picture: user.assigned_to.profile_picture,
        followers: user.assigned_to.followers,
      },
      comments: updatedPost.comments,
    });
  } catch (error) {
    res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id; // Extract post ID from request parameters

     // Check if the logged-in user is the creator of the post
     if (req.body.assigned_to.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this post' });
    }


    const deletedPost = await Post.findByIdAndDelete(postId); // Find and delete the post

    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};