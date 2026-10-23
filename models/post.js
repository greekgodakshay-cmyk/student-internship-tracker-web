const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  }
}, { timestamps: true });

postSchema.index({ createdAt: -1, author: 1 });

module.exports = mongoose.model('Post', postSchema);
