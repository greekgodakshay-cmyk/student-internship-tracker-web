

const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },

    location: {
      type: String,
      trim: true,
      default: "Not specified"
    },

    workMode: {
      type: String,
      enum: ["Remote", "On-site", "Hybrid", "Not specified"],
      default: "Not specified"
    },

    requiredSkills: [{
      type: String,
      trim: true,
      maxlength: 100
    }],

    applicationUrl: {
      type: String,
      required: true,
      trim: true
    },

    deadline: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Internship", internshipSchema);

