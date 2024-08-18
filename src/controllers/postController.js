const Post = require("../models/Post");
const mongoose = require("mongoose");
const User = require("../models/User");
const Comment = require("../models/Comment");
const bucket = require("../../config/firebaseConfig");

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Post created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
exports.createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const user = req.user;

    if (!file) {
      return res.status(400).json({ message: "Please attach a file" });
    }

    const filePath = `posts/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(filePath);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on("error", (error) => {
      console.error(error);
      return res.status(500).json({ message: "Server error", error });
    });

    blobStream.on("finish", async () => {
      await fileUpload.makePublic();

      const newPost = new Post({
        title,
        description,
        image_url: fileUpload.publicUrl(),
        assigned_to: req.user,
      });

      // Save the post to the database
      const savedPost = await newPost.save();

      // Send a response back to the client
      res.status(200).json({
        message: "Post created successfully",
        post: {
          id: savedPost._id,
          title: savedPost.title,
          description: savedPost.description,
          image_url: savedPost.image_url,
          likes: savedPost.likes,
          created_at: savedPost.created_at,
          assigned_to: {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture,
          },
        },
      });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      message: "An error occurred while creating the post",
    });
  }
};

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       400:
 *         description: Bad request
 */
exports.getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    const user = req.user;

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      message: "Post retrieved successfully",
      post: {
        id: post._id,
        title: post.title,
        description: post.description,
        image_url: post.image_url,
        likes: post.likes,
        assigned_to: {
          id: user.id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture,
        },
        createdAt: post.created_at,
        comments: post.comments,
      },
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    let downloadURL = post.image_url;
    const file = req.file;
    var user = req.user;

    if (!post) {
      return res.status(404).json({ message: "This post does not exist" });
    }

    if (post.assigned_to.toString() !== user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this post" });
    }

    if (!file) {
      return res.status(400).json({ message: "Please attach a file" });
    }

    if (file) {
      const filePath = `posts/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(filePath);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on("error", (error) => {
        console.error(error);
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

    const updatedPostData = {
      ...req.body,
      image_url: downloadURL,
    };

    const updatedPost = await Post.findByIdAndUpdate(postId, updatedPostData, {
      new: true,
    });

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const responsePost = {
      id: updatedPost._id,
      title: updatedPost.title,
      description: updatedPost.description,
      image_url: updatedPost.image_url,
      likes: updatedPost.likes,
      assigned_to: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
      },
    };

    res.json({ message: "Post updated successfully", post: responsePost });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       400:
 *         description: Bad request
 */
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (post.assigned_to.id != req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

/**
 * @swagger
 * /posts/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post has been liked/unliked successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;
    const hasLiked = post.likedBy.includes(userId);

    if (hasLiked) {
      // User has already liked the post, so remove the like
      post.likes -= 1;
      post.likedBy = post.likedBy.filter((id) => !id.equals(userId));
      await post.save();
      res.json({
        message: "Post has been unliked successfully",
        likes: post.likes,
      });
    } else {
      // User has not liked the post, so add the like
      post.likes += 1;
      post.likedBy.push(userId);
      await post.save();
      res.json({
        message: "Post has been liked successfully",
        likes: post.likes,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /posts/{id}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
exports.createComment = async (req, res) => {
  try {
    const { postId, comment } = req.body;
    const userId = req.user._id;

    const newComment = new Comment({
      comment,
      user: userId,
      postId: postId,
    });

    const savedComment = await newComment.save();

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push(savedComment._id);

    await post.save();

    const responseComment = {
      id: savedComment._id,
      user: savedComment.user,
      comment: savedComment.comment,
      likes: savedComment.likes,
      likedBy: savedComment.likedBy,
      timestamp: savedComment.timestamp,
    };

    res.status(201).json({
      message: "Comment added successfully",
      comment: responseComment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * @swagger
 * /posts/{id}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *       404:
 *         description: Post not found
 *       400:
 *         description: Bad request
 */
exports.getCommentsForPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ postId: postId })
      .skip(skip)
      .limit(limit)
      .populate("user", "username email profile_picture")
      .exec();

    const totalComments = await Comment.countDocuments({ postId: postId });

    const formattedComments = comments.map((comment) => ({
      id: comment._id,
      user: {
        id: comment.user.id,
        email: comment.user.email,
        profile_picture: comment.user.profile_picture,
        username: comment.user.username,
      },
      comment: comment.comment,
      likes: comment.likes,
      likedBy: comment.likedBy,
      created_at: comment.timestamp,
    }));

    res.json({
      page,
      limit,
      totalComments,
      comments: formattedComments,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of posts per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to filter posts
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       400:
 *         description: Bad request
 */
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.query.userId;

    let query = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query = { assigned_to: new mongoose.Types.ObjectId(userId) };
    }

    const posts = await Post.find(query)
      .skip(skip)
      .limit(limit)
      .populate("assigned_to", "username email profile_picture")
      .exec();

    const totalPosts = await Post.countDocuments(query);

    const formattedPosts = posts.map((post) => ({
      id: post._id,
      title: post.title,
      description: post.description,
      image_url: post.image_url,
      likes: post.likes,
      assigned_to: post.assigned_to
        ? {
            id: post.assigned_to._id,
            username: post.assigned_to.username,
            email: post.assigned_to.email,
            profile_picture: post.assigned_to.profile_picture,
          }
        : {},
      created_at: post.created_at,
    }));

    res.json({
      page,
      limit,
      totalPosts,
      posts: formattedPosts,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};
