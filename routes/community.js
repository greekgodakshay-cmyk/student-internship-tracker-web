const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Internship = require('../models/Internship');
const SocialInteraction = require('../models/SocialInteraction');
const Course = require('../models/Course');
const Skill = require('../models/Skill');
const Notification = require('../models/Notification');
const router = express.Router();
function requireAuth(req,res,next){ if(!req.session?.userId) return res.status(401).json({message:'Please log in to continue.'}); if(!mongoose.isValidObjectId(req.session.userId)) return res.status(401).json({message:'Invalid session.'}); next(); }
router.use(requireAuth);
router.get('/search', async (req,res)=>{
 try {
  const q=String(req.query.q||'').trim().slice(0,100);
  if(q.length < 2) return res.json({users:[],internships:[],courses:[],skills:[],message:q ? 'Enter at least 2 characters to search.' : ''});
  const rx=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
  const [users,internships,courses,skills]=await Promise.all([
   User.find({publicProfile:true,_id:{$ne:req.session.userId},$or:[{name:rx},{college:rx},{degree:rx},{fieldOfStudy:rx},{bio:rx}]}).select('name college degree studyYear fieldOfStudy location bio publicProfile').limit(20).lean(),
   Internship.find({isActive:true,$or:[{title:rx},{company:rx},{description:rx},{location:rx},{requiredSkills:rx}]}).select('title company description location workMode requiredSkills applicationUrl deadline').limit(20).lean(),
   Course.find({isPublished:true,$or:[{title:rx},{description:rx},{category:rx},{instructor:rx},{'lessons.title':rx}]}).select('title description category level instructor lessons').limit(20).lean(),
   Skill.aggregate([{ $match:{name:rx} },{ $group:{_id:{name:'$name',category:'$category'},users:{$addToSet:'$user'} } },{ $project:{_id:0,name:'$_id.name',category:'$_id.category',userCount:{$size:'$users'}} },{ $sort:{userCount:-1,name:1} },{ $limit:20}])
  ]);
  users.sort((a,b)=>Number(rx.test(b.name))-Number(rx.test(a.name)));
  internships.sort((a,b)=>Number(rx.test(b.title))-Number(rx.test(a.title)));
  courses.sort((a,b)=>Number(rx.test(b.title))-Number(rx.test(a.title)));
  res.json({users:users.map(u=>({...u,id:u._id})),internships,courses,skills});
 } catch(e){ console.error('Community search:'.replace(/[: ]+$/, "") + " failed."); res.status(500).json({message:'Unable to search right now.'}); }
});
router.get('/users/:id', async(req,res)=>{
 try {
  if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:'Invalid profile.'});
  const user=await User.findOne({_id:req.params.id,publicProfile:true}).select('name college degree studyYear fieldOfStudy location bio createdAt').lean();
  if(!user) return res.status(404).json({message:'This profile is private or unavailable.'});
  const [skills,projects]=await Promise.all([
   Skill.find({user:user._id}).select('name category proficiency createdAt').sort({createdAt:-1}).lean(),
   Project.find({user:user._id,certificateUrl:{$ne:''}}).select('title description technologies projectUrl certificateUrl completedAt createdAt').sort({createdAt:-1}).lean()
  ]);
  res.json({user:{...user,id:user._id},skills,certificates:projects});
 } catch(e){ console.error('Public profile:'.replace(/[: ]+$/, "") + " failed."); res.status(500).json({message:'Unable to load this profile.'}); }
});
router.patch('/privacy', async(req,res)=>{
 if(typeof req.body.publicProfile!=='boolean') return res.status(400).json({message:'Choose public or private profile visibility.'});
 try { const current=await User.findById(req.session.userId).select('age'); if(req.body.publicProfile && current?.age !== null && current?.age !== undefined && current.age < 18) return res.status(403).json({message:'Public profile visibility is unavailable for accounts with an age under 18.'}); const user=await User.findByIdAndUpdate(req.session.userId,{$set:{publicProfile:req.body.publicProfile}},{new:true}).select('publicProfile'); res.json({publicProfile:user.publicProfile,message:`Profile is now ${user.publicProfile?'public':'private'}.`}); }
 catch(e){ console.error('Privacy update:'.replace(/[: ]+$/, "") + " failed."); res.status(500).json({message:'Unable to update profile visibility.'}); }
});
router.get('/interactions/:type/:id', async(req,res)=>{
 const {type,id}=req.params;
 if(!['profile','certificate'].includes(type)||!mongoose.isValidObjectId(id)) return res.status(400).json({message:'Invalid item.'});
 try {
  if(type==='profile') { const u=await User.findOne({_id:id,publicProfile:true}).select('_id'); if(!u) return res.status(404).json({message:'Profile unavailable.'}); }
  else { const p=await Project.findOne({_id:id,certificateUrl:{$ne:''}}).select('user'); if(!p) return res.status(404).json({message:'Certificate unavailable.'}); const u=await User.findOne({_id:p.user,publicProfile:true}).select('_id'); if(!u) return res.status(404).json({message:'Certificate unavailable.'}); }
  const [likes,comments,liked]=await Promise.all([SocialInteraction.countDocuments({targetType:type,targetId:id,action:'like'}),SocialInteraction.find({targetType:type,targetId:id,action:'comment'}).sort({createdAt:-1}).limit(30).populate('actor','name').lean(),SocialInteraction.exists({targetType:type,targetId:id,actor:req.session.userId,action:'like'})]);
  res.json({likes,liked:!!liked,comments:comments.map(c=>({id:c._id,name:c.actor?.name||'User',text:c.text,createdAt:c.createdAt}))});
 } catch(e){console.error('Social read:'.replace(/[: ]+$/, "") + " failed.");res.status(500).json({message:'Unable to load interactions.'});}
});
router.post('/interactions/:type/:id/like', async(req,res)=>{
 const {type,id}=req.params;
 if(!['profile','certificate'].includes(type)||!mongoose.isValidObjectId(id)) return res.status(400).json({message:'Invalid item.'});
 try {
  if(type==='profile') { if(!await User.exists({_id:id,publicProfile:true})) return res.status(404).json({message:'Profile unavailable.'}); }
  else { const p=await Project.findOne({_id:id,certificateUrl:{$ne:''}}).select('user'); if(!p||!await User.exists({_id:p.user,publicProfile:true})) return res.status(404).json({message:'Certificate unavailable.'}); }
  const query={targetType:type,targetId:id,actor:req.session.userId,action:'like'};
  const existing=await SocialInteraction.findOne(query);
  if(existing) await existing.deleteOne(); else {
   await SocialInteraction.create({...query,text:''});
   const ownerId = type==='profile' ? id : (await Project.findById(id).select('user'))?.user;
   if(ownerId && String(ownerId)!==String(req.session.userId)) await Notification.create({recipient:ownerId,actor:req.session.userId,type:'profile',title:'New profile activity',body:'Someone liked your '+(type==='profile'?'profile':'certificate')+'.',targetId:id});
  }
  res.json({liked:!existing,likes:await SocialInteraction.countDocuments({targetType:type,targetId:id,action:'like'})});
 } catch(e){ if(e.code===11000) return res.json({liked:true}); console.error('Like:'.replace(/[: ]+$/, "") + " failed.");res.status(500).json({message:'Unable to update like.'}); }
});
router.post('/interactions/:type/:id/comments', async(req,res)=>{
 const {type,id}=req.params, text=typeof req.body.text==='string'?req.body.text.trim():'';
 if(!['profile','certificate'].includes(type)||!mongoose.isValidObjectId(id)) return res.status(400).json({message:'Invalid item.'});
 if(!text||text.length>500) return res.status(400).json({message:'Comment must be 1–500 characters.'});
 try {
  if(type==='profile') { if(!await User.exists({_id:id,publicProfile:true})) return res.status(404).json({message:'Profile unavailable.'}); }
  else { const p=await Project.findOne({_id:id,certificateUrl:{$ne:''}}).select('user'); if(!p||!await User.exists({_id:p.user,publicProfile:true})) return res.status(404).json({message:'Certificate unavailable.'}); }
  const comment=await SocialInteraction.create({targetType:type,targetId:id,actor:req.session.userId,action:'comment',text});
  const ownerId = type==='profile' ? id : (await Project.findById(id).select('user'))?.user;
  if(ownerId && String(ownerId)!==String(req.session.userId)) await Notification.create({recipient:ownerId,actor:req.session.userId,type:'profile',title:'New profile activity',body:'Someone commented on your '+(type==='profile'?'profile':'certificate')+'.',targetId:id});
  const actor=await User.findById(req.session.userId).select('name');
  res.status(201).json({comment:{id:comment._id,name:actor?.name||'You',text:comment.text,createdAt:comment.createdAt}});
 } catch(e){console.error('Comment:'.replace(/[: ]+$/, "") + " failed.");res.status(500).json({message:'Unable to add comment.'});}
});
module.exports=router;
