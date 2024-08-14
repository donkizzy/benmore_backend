const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image_url: { type: String },
  created_at: { type: Date, default: Date.now },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
  }],
  likes: { type: Number, default: 0 },
  status: { type: String, enum: ['In Progress', 'Completed', 'Overdue'], default: 'In Progress' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Post', PostSchema);