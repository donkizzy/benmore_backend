const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image_url: { type: String },
  created_at: { type: Date, default: Date.now },
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
  }],
  likes: { type: Number, default: 0 },
  status: { type: String, enum: ['In Progress', 'Completed', 'Overdue'], default: 'In Progress' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Post', PostSchema);