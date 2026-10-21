

const express = require("express");
const mongoose = require("mongoose");
const Skill = require("../models/Skill");

const router = express.Router();

const ALLOWED_CATEGORIES = [
  "Programming",
  "Web Development",
  "Database",
  "AI & Machine Learning",
  "Cloud Computing",
  "Tools",
  "Soft Skills",
  "Other"
];

const ALLOWED_PROFICIENCY = [
  "Beginner",
  "Intermediate",
  "Advanced"
];

// Ensure the student is logged in.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in to manage your skills."
    });
  }

  if (!mongoose.isValidObjectId(req.session.userId)) {
    return res.status(401).json({
      message: "Invalid session. Please log in again."
    });
  }

  next();
}

// GET /api/skills — list the logged-in student's skills
router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const filter = { user: req.session.userId };
    const [skills, total] = await Promise.all([
      Skill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Skill.countDocuments(filter)
    ]);

    return res.json({ skills, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Fetch skills error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to load skills right now."
    });
  }
});

// POST /api/skills — add a skill
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, category, proficiency } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Please enter a skill name."
      });
    }

    const cleanName = name.trim();

    if (cleanName.length > 100) {
      return res.status(400).json({
        message: "Skill name cannot exceed 100 characters."
      });
    }

    if (
      category !== undefined &&
      (typeof category !== "string" ||
        !ALLOWED_CATEGORIES.includes(category))
    ) {
      return res.status(400).json({
        message: "Please select a valid skill category."
      });
    }

    if (
      proficiency !== undefined &&
      (typeof proficiency !== "string" ||
        !ALLOWED_PROFICIENCY.includes(proficiency))
    ) {
      return res.status(400).json({
        message: "Please select a valid proficiency level."
      });
    }

    const skill = await Skill.create({
      user: req.session.userId,
      name: cleanName,
      category: category || "Other",
      proficiency: proficiency || "Beginner"
    });

    return res.status(201).json({
      message: "Skill added successfully.",
      skill
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already added this skill."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please check the skill details and try again."
      });
    }

    console.error("Add skill error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to add this skill right now."
    });
  }
});

// DELETE /api/skills/:id — delete one of the student's own skills
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid skill ID."
      });
    }

    const skill = await Skill.findOneAndDelete({
      _id: id,
      user: req.session.userId
    });

    if (!skill) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    return res.json({
      message: "Skill deleted successfully."
    });
  } catch (error) {
    console.error("Delete skill error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to delete this skill right now."
    });
  }
});

module.exports = router;

