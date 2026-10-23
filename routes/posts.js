const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const SocialInteraction = require('../models/SocialInteraction');
const Notification = require('../models/Notification');

const router = express.Router();
const MAX_FEED_ITEMS = 50;
const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 500;

router.use((req, res, next) => {
  if (!req.session?.userId || !mongoose.isValidObjectId(req.session.userId)) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }
  next();
});

const currentUserId = req => req.session.userId;
const canViewAuthor = (author, viewerId) => Boolean(author && (author.publicProfile || String(author._id) === String(viewerId)));

async function findVisiblePost(postId, viewerId) {
  if (!mongoose.isValidObjectId(postId)) return null;
  const post = await Post.findById(postId).populate({ path: 'author', select: 'name publicProfile +photoData' });
  if (!post || !canViewAuthor(post.author, viewerId)) return null;
  return post;
}

function serializePost(post) {
  return {
    id: String(post._id),
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      id: String(post.author._id),
      name: post.author.name || 'Student',
      photoData: typeof post.author.photoData === 'string' ? post.author.photoData : ''
    }
  };
}

// Public feed: public profiles only. Supplying ?profile=<id> requests a profile grid;
// private profiles can only be requested by their owner.
router.get('/', async (req, res) => {
  try {
    const profileId = typeof req.query.profile === 'string' ? req.query.profile : '';
    let postFilter = {};
    let authorMatch = { publicProfile: true };
    if (profileId) {
      if (!mongoose.isValidObjectId(profileId)) return res.status(400).json({ message: 'Invalid profile.' });
      const profile = await User.findById(profileId).select('_id publicProfile');
      if (!profile || (!profile.publicProfile && String(profile._id) !== String(currentUserId(req)))) {
        return res.status(404).json({ message: 'This profile is private or unavailable.' });
      }
      postFilter = { author: profile._id };
      // The owner can view their own posts even when their profile is private.
      authorMatch = {};
    }

    const posts = await Post.find(postFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(profileId ? MAX_FEED_ITEMS : MAX_FEED_ITEMS * 2)
      .populate({ path: 'author', match: authorMatch, select: 'name publicProfile +photoData' })
      .lean();
    const visible = posts.filter(post => post.author && canViewAuthor(post.author, currentUserId(req))).slice(0, MAX_FEED_ITEMS);
    res.json({ posts: visible.map(post => ({
      id: String(post._id), content: post.content, createdAt: post.createdAt, updatedAt: post.updatedAt,
      author: { id: String(post.author._id), name: post.author.name || 'Student', photoData: typeof post.author.photoData === 'string' ? post.author.photoData : '' }
    })) });
  } catch (_) {
    res.status(500).json({ message: 'Unable to load posts right now.' });
  }
});

router.post('/', async (req, res) => {
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > MAX_POST_LENGTH) {
    return res.status(400).json({ message: `Post content must be 1–${MAX_POST_LENGTH} characters.` });
  }
  try {
    const author = await User.findById(currentUserId(req)).select('name publicProfile +photoData');
    if (!author) return res.status(401).json({ message: 'Please log in to continue.' });
    const post = await Post.create({ author: author._id, content });
    res.status(201).json({ post: serializePost({ ...post.toObject(), author }) });
  } catch (_) {
    res.status(500).json({ message: 'Unable to publish this post.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid post.' });
  try {
    const post = await Post.findOne({ _id: req.params.id, author: currentUserId(req) });
    if (!post) return res.status(404).json({ message: 'Post unavailable.' });
    await Promise.all([
      post.deleteOne(),
      SocialInteraction.deleteMany({ targetType: 'post', targetId: post._id })
    ]);
    res.json({ message: 'Post deleted.' });
  } catch (_) {
    res.status(500).json({ message: 'Unable to delete this post.' });
  }
});

router.get('/:id/interactions', async (req, res) => {
  try {
    const post = await findVisiblePost(req.params.id, currentUserId(req));
    if (!post) return res.status(404).json({ message: 'Post unavailable.' });
    const query = { targetType: 'post', targetId: post._id };
    const [likes, comments, liked] = await Promise.all([
      SocialInteraction.countDocuments({ ...query, action: 'like' }),
      SocialInteraction.find({ ...query, action: 'comment' }).sort({ createdAt: -1 }).limit(30).populate('actor', 'name').lean(),
      SocialInteraction.exists({ ...query, actor: currentUserId(req), action: 'like' })
    ]);
    res.json({ likes, liked: Boolean(liked), comments: comments.reverse().map(comment => ({
      id: String(comment._id), name: comment.actor?.name || 'Student', text: comment.text, createdAt: comment.createdAt
    })) });
  } catch (_) {
    res.status(500).json({ message: 'Unable to load post interactions.' });
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    const post = await findVisiblePost(req.params.id, currentUserId(req));
    if (!post) return res.status(404).json({ message: 'Post unavailable.' });
    const query = { targetType: 'post', targetId: post._id, actor: currentUserId(req), action: 'like' };
    const existing = await SocialInteraction.findOne(query);
    if (existing) {
      await existing.deleteOne();
    } else {
      await SocialInteraction.create({ ...query, text: '' });
      if (String(post.author._id) !== String(currentUserId(req))) {
        await Notification.create({ recipient: post.author._id, actor: currentUserId(req), type: 'profile', title: 'Post appreciated', body: 'Someone appreciated your post.', targetId: post._id });
      }
    }
    res.json({ liked: !existing, likes: await SocialInteraction.countDocuments({ targetType: 'post', targetId: post._id, action: 'like' }) });
  } catch (error) {
    if (error.code === 11000) return res.json({ liked: true });
    res.status(500).json({ message: 'Unable to appreciate this post.' });
  }
});

router.post('/:id/comments', async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > MAX_COMMENT_LENGTH) return res.status(400).json({ message: `Comment must be 1–${MAX_COMMENT_LENGTH} characters.` });
  try {
    const post = await findVisiblePost(req.params.id, currentUserId(req));
    if (!post) return res.status(404).json({ message: 'Post unavailable.' });
    const comment = await SocialInteraction.create({ targetType: 'post', targetId: post._id, actor: currentUserId(req), action: 'comment', text });
    const actor = await User.findById(currentUserId(req)).select('name');
    if (String(post.author._id) !== String(currentUserId(req))) {
      await Notification.create({ recipient: post.author._id, actor: currentUserId(req), type: 'profile', title: 'New post comment', body: 'Someone commented on your post.', targetId: post._id });
    }
    res.status(201).json({ comment: { id: String(comment._id), name: actor?.name || 'You', text: comment.text, createdAt: comment.createdAt } });
  } catch (_) {
    res.status(500).json({ message: 'Unable to add your comment.' });
  }
});

module.exports = router;
