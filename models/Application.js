

const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true
    },

    status: {
      type: String,
      enum: [
        "Interested",
        "Applied",
        "Interview",
        "Offered",
        "Rejected",
        "Withdrawn"
      ],
      default: "Interested"
    },

    appliedAt: {
      type: Date,
      default: null
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index(
  { user: 1, internship: 1 },
  { unique: true }
);

module.exports = mongoose.model("Application", applicationSchema);

