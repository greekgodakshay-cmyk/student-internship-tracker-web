

const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    videoUrl: {
      type: String,
      trim: true,
      default: ""
    },

    resourceUrl: {
      type: String,
      trim: true,
      default: ""
    },

    order: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    category: {
      type: String,
      trim: true,
      default: "General"
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner"
    },

    instructor: {
      type: String,
      trim: true,
      default: ""
    },

    lessons: {
      type: [lessonSchema],
      default: []
    },

    isPublished: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Course", courseSchema);

