

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student"
    },

    // Optional profile details; account role remains controlled by the server.
    age: {
      type: Number,
      min: 13,
      max: 120,
      default: null
    },
    professionType: {
      type: String,
      enum: ["student", "working professional", "freelancer", "other"],
      default: "student"
    },
    college: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ""
    },
    degree: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    studyYear: {
      type: String,
      trim: true,
      maxlength: 60,
      default: ""
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    hobbies: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ""
    },
    publicProfile: {
      type: Boolean,
      default: false,
      index: true
    },
    photoData: {
      type: String,
      default: "",
      maxlength: 1200000,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);

