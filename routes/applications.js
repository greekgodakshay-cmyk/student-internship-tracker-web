

const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Internship = require("../models/Internship");

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }
  next();
}

router.use(requireAuth);

const allowedStatuses = [
  "Interested",
  "Applied",
  "Interview",
  "Offered",
  "Rejected",
  "Withdrawn"
];

// GET /api/applications — list the logged-in student's applications.
router.get("/", async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const filter = { user: req.session.userId };
    const [applications, total] = await Promise.all([
      Application.find(filter).populate("internship").sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Application.countDocuments(filter)
    ]);

    return res.json({ applications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Fetch applications error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to retrieve applications."
    });
  }
});

// POST /api/applications — track an internship.
router.post("/", async (req, res) => {
  try {
    const { internshipId, status, notes } = req.body;

    if (!mongoose.isValidObjectId(internshipId)) {
      return res.status(400).json({
        message: "A valid internship ID is required."
      });
    }

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid application status."
      });
    }

    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      return res.status(400).json({
        message: "Notes must be 1000 characters or fewer."
      });
    }

    const internship = await Internship.findOne({
      _id: internshipId,
      isActive: true
    });

    if (!internship) {
      return res.status(404).json({
        message: "Active internship not found."
      });
    }

    const selectedStatus = status || "Interested";

    const application = await Application.create({
      user: req.session.userId,
      internship: internship._id,
      status: selectedStatus,
      appliedAt: selectedStatus === "Applied" ? new Date() : null,
      notes: notes || ""
    });

    await application.populate("internship");

    return res.status(201).json({
      message: "Internship added to your tracker.",
      application
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You are already tracking this internship."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Application details are invalid."
      });
    }

    console.error("Create application error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to track this internship."
    });
  }
});

// PATCH /api/applications/:id — update status or notes.
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid application ID."
      });
    }

    const updates = {};
    const { status, notes } = req.body;

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid application status."
        });
      }

      updates.status = status;
      updates.appliedAt =
        status === "Applied" ? new Date() : undefined;
    }

    if (notes !== undefined) {
      if (typeof notes !== "string" || notes.length > 1000) {
        return res.status(400).json({
          message: "Notes must be 1000 characters or fewer."
        });
      }

      updates.notes = notes.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide a status or notes to update."
      });
    }

    // Ownership filter prevents editing another student's tracker.
    const application = await Application.findOne({
      _id: id,
      user: req.session.userId
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found."
      });
    }

    if (status !== undefined) {
      application.status = updates.status;

      if (status === "Applied" && !application.appliedAt) {
        application.appliedAt = new Date();
      }
    }

    if (notes !== undefined) {
      application.notes = updates.notes;
    }

    await application.save();
    await application.populate("internship");

    return res.json({
      message: "Application updated successfully.",
      application
    });
  } catch (error) {
    console.error("Update application error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to update application."
    });
  }
});

// DELETE /api/applications/:id — remove from the student's tracker.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid application ID."
      });
    }

    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found."
      });
    }

    return res.json({
      message: "Application removed from your tracker."
    });
  } catch (error) {
    console.error("Delete application error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to remove application."
    });
  }
});

module.exports = router;

