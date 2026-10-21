const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  recipient:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  actor:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
  type:{type:String,enum:['course','internship','follow','follow_request','message','profile'],required:true},
  title:{type:String,required:true,maxlength:180},
  body:{type:String,default:'',maxlength:500},
  targetId:{type:mongoose.Schema.Types.ObjectId,default:null},
  readAt:{type:Date,default:null,index:true}
},{timestamps:true});
schema.index({recipient:1,createdAt:-1});
module.exports=mongoose.model('Notification',schema);
