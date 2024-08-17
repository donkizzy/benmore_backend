const Post = require('../models/Post');
const mongoose = require('mongoose');
const User = require('../models/User');
const Comment = require('../models/Comment');
const bucket = require('../../config/firebaseConfig');


exports.createPost = async (req, res) => {
  try {
    // Extract data from the request body
    const { title, description } = req.body;
    const assignedToObjectId = mongoose.isValidObjectId(req.user.id) ? req.user.id : new mongoose.Types.ObjectId();

    const file = req.file; 

    if (!file) {
      return res.status(400).json({ message: 'Please attach a file' });
    }

    const filePath = `posts/${assignedToObjectId}/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(filePath);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    blobStream.on('error', (error) => {
      console.error(error);
      return res.status(500).json({ message: 'Server error', error });
    });

    blobStream.on('finish', async () => {
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;

      // Create a new post instance
      const newPost = new Post({
        title,
        description,
        image_url: downloadURL,
        assigned_to: assignedToObjectId,
      });

      // Save the post to the database
      const savedPost = await newPost.save();

      const user = req.user;

      // Send a response back to the client
      res.status(200).json({
        message: 'Post created successfully',
        post: {
          id: savedPost._id,
          title: savedPost.title,
          description: savedPost.description,
          image_url: savedPost.image_url,
          likes: savedPost.likes,
          assigned_to: {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
          },
          createdAt: savedPost.created_at,
        }
      });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      message: 'An error occurred while creating the post'
    });
  }
};

exports.getPost = async (req, res) => {
  try {
      const postId = req.params.id; 
      const post = await Post.findById(postId); 
      const user = req.user

      if (!post) {
          return res.status(404).json({ message: 'Post not found' });
      }

      res.status(200).json({
        message: 'Post retrieved successfully',
        post: {
          id: post._id,
          title: post.title,
          description: post.description,
          image_url: post.image_url,
          likes: post.likes,
          assigned_to: {
            id:  user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
            followers: user.followers,
          },
          createdAt: post.created_at,
          comments: post.comments,
        }
      }); // Send the post data as a response
  } catch (error) {
      res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id; 
    const post = await Post.findById(postId); 
    const user = req.user;

    if (!post) {
      return res.status(400).json({ message: 'This post does not exist' });
    }

    // Check if the logged-in user is the creator of the post
    if (post.assigned_to != user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this post' });
    }

    const file = req.file;

    let downloadURL = post.image_url; // Default to existing image_url

    if (file) {
      const filePath = `posts/${user.id}/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(filePath);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype
        }
      });

      blobStream.on('error', (error) => {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
      });

      await new Promise((resolve, reject) => {
        blobStream.on('finish', () => {
          downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
          resolve();
        });
        blobStream.end(file.buffer);
      });
    }

    const updatedPostData = {
      ...req.body,
      image_url: downloadURL
    };

    const updatedPost = await Post.findByIdAndUpdate(postId, updatedPostData, { new: true });

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const responsePost = {
      id: updatedPost._id,
      title: updatedPost.title,
      description: updatedPost.description,
      image_url: updatedPost.image_url,
      likes: updatedPost.likes,
      likedBy: updatedPost.likedBy,
      assigned_to: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        followers: user.followers,
      },
    };

    res.json({ message: 'Post updated successfully', post: responsePost });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id; 
    const post = await Post.findById(postId); 

     // Check if the logged-in user is the creator of the post
     if (post.assigned_to != req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this post' });
    }

    const deletedPost = await Post.findByIdAndDelete(postId); 
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'An error occurred', error: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id;
    const hasLiked = post.likedBy.includes(userId);

    if (hasLiked) {
      // User has already liked the post, so remove the like
      post.likes -= 1;
      post.likedBy = post.likedBy.filter(id => !id.equals(userId));
      await post.save();
      res.json({ message: 'Post has been unliked successfully', likes: post.likes });
    } else {
      // User has not liked the post, so add the like
      post.likes += 1;
      post.likedBy.push(userId);
      await post.save();
    res.json({ message: 'Post has been liked successfully', likes: post.likes });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { postId, comment } = req.body;
    const userId = req.user._id;

    const newComment = new Comment({
      comment,
      user: userId
    });

    const savedComment = await newComment.save();

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push(savedComment._id);

    await post.save();

    const responseComment = {
      id: savedComment._id,
      user: savedComment.user,
      comment: savedComment.comment,
      likes: savedComment.likes,
      likedBy: savedComment.likedBy,
      timestamp: savedComment.timestamp
    };

    res.status(201).json({ message: 'Comment added successfully', comment: responseComment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getCommentsForPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId).populate('comments');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comments = post.comments.map(comment => ({
      id: comment._id,
      user: comment.user,
      comment: comment.comment,
      likes: comment.likes,
      likedBy: comment.likedBy,
      timestamp: comment.timestamp
    }));

    res.json(comments);
  } catch (error) {
    res.status(400).json({ message: error });
  }
};
