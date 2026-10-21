const mongoose = require('mongoose');
const socialInteractionSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['profile', 'certificate'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, enum: ['like', 'comment'], required: true },
  text: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });
socialInteractionSchema.index({ targetType: 1, targetId: 1, actor: 1, action: 1 }, { unique: true, partialFilterExpression: { action: 'like' } });
module.exports = mongoose.model('SocialInteraction', socialInteractionSchema);
