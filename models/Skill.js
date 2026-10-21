

const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    category: {
      type: String,
      enum: [
        "Programming",
        "Web Development",
        "Database",
        "AI & Machine Learning",
        "Cloud Computing",
        "Tools",
        "Soft Skills",
        "Other"
      ],
      default: "Other"
    },

    proficiency: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner"
    }
  },
  {
    timestamps: true
  }
);

skillSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Skill", skillSchema);

