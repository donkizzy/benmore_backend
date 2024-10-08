const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, },
  profile_picture: { type: String },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  profileViews: { type: Number, default: 0 },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);