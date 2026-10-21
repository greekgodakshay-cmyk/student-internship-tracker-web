

const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    technologies: [{
      type: String,
      trim: true,
      maxlength: 50
    }],

    projectUrl: {
      type: String,
      trim: true,
      default: ""
    },

    certificateUrl: {
      type: String,
      trim: true,
      default: ""
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Project", projectSchema);

