const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  sender:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  recipient:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  text:{type:String,required:true,trim:true,maxlength:4000}
},{timestamps:true});
schema.index({sender:1,recipient:1,createdAt:-1});
schema.index({recipient:1,sender:1,createdAt:-1});
module.exports=mongoose.model('Message',schema);
