const Post = require('../models/Post');
const mongoose = require('mongoose');
const User = require('../models/User');
const Comment = require('../models/Comment');

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

    const user = req.user
  
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

    if(!post){
      return res.status(400).json({ message: 'This post does not' });
    }

     // Check if the logged-in user is the creator of the post
     if (post.assigned_to != user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this post' });
    }


    const updatedPost = await Post.findByIdAndUpdate(postId, req.body, { new: true }); 

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const responsePost = {
      id: updatedPost._id,
      title: updatedPost.title,
      content: updatedPost.content,
      assigned_to: updatedPost.assigned_to,
      comments: updatedPost.comments,
      likes: updatedPost.likes,
      likedBy: updatedPost.likedBy,
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
