

const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");

const router = express.Router();

// Protect every project endpoint.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  next();
}

router.use(requireAuth);

// Validate optional URLs.
function validOptionalUrl(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value !== "string" || value.length > 2048) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// GET /api/projects — list the current student's projects.
router.get("/", async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const filter = { user: req.session.userId };
    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(filter)
    ]);

    return res.json({ projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Fetch projects error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to retrieve projects."
    });
  }
});

// POST /api/projects — create a project.
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      technologies,
      projectUrl,
      certificateUrl,
      completedAt
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 2000
    ) {
      return res.status(400).json({
        message: "A title (max 150 characters) and description (max 2000 characters) are required."
      });
    }

    if (
      technologies !== undefined &&
      (!Array.isArray(technologies) ||
        technologies.length > 30 ||
        technologies.some(
          (tech) =>
            typeof tech !== "string" ||
            !tech.trim() ||
            tech.trim().length > 50
        ))
    ) {
      return res.status(400).json({
        message: "Technologies must be an array of up to 30 valid names."
      });
    }

    if (
      !validOptionalUrl(projectUrl) ||
      !validOptionalUrl(certificateUrl)
    ) {
      return res.status(400).json({
        message: "Project and certificate links must be valid HTTP or HTTPS URLs."
      });
    }

    let cleanCompletedAt = null;

    if (completedAt !== undefined && completedAt !== null && completedAt !== "") {
      cleanCompletedAt = new Date(completedAt);

      if (Number.isNaN(cleanCompletedAt.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid completion date."
        });
      }
    }

    const project = await Project.create({
      user: req.session.userId,
      title: title.trim(),
      description: description.trim(),
      technologies: (technologies || []).map((tech) => tech.trim()),
      projectUrl: projectUrl || "",
      certificateUrl: certificateUrl || "",
      completedAt: cleanCompletedAt
    });

    return res.status(201).json({
      message: "Project created successfully.",
      project
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Project details are invalid."
      });
    }

    console.error("Create project error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to create project."
    });
  }
});

// PUT /api/projects/:id — update only a project owned by this student.
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID."
      });
    }

    const allowedFields = [
      "title",
      "description",
      "technologies",
      "projectUrl",
      "certificateUrl",
      "completedAt"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update."
      });
    }

    if (
      "title" in updates &&
      (typeof updates.title !== "string" ||
        !updates.title.trim() ||
        updates.title.trim().length > 150)
    ) {
      return res.status(400).json({
        message: "Title must be between 1 and 150 characters."
      });
    }

    if (
      "description" in updates &&
      (typeof updates.description !== "string" ||
        !updates.description.trim() ||
        updates.description.trim().length > 2000)
    ) {
      return res.status(400).json({
        message: "Description must be between 1 and 2000 characters."
      });
    }

    if ("technologies" in updates) {
      if (
        !Array.isArray(updates.technologies) ||
        updates.technologies.length > 30 ||
        updates.technologies.some(
          (tech) =>
            typeof tech !== "string" ||
            !tech.trim() ||
            tech.trim().length > 50
        )
      ) {
        return res.status(400).json({
          message: "Technologies must be an array of up to 30 valid names."
        });
      }

      updates.technologies = updates.technologies.map((tech) => tech.trim());
    }

    for (const field of ["projectUrl", "certificateUrl"]) {
      if (field in updates) {
        if (!validOptionalUrl(updates[field])) {
          return res.status(400).json({
            message: `${field} must be a valid HTTP or HTTPS URL.`
          });
        }

        updates[field] = updates[field] || "";
      }
    }

    if ("completedAt" in updates) {
      if (updates.completedAt === "" || updates.completedAt === null) {
        updates.completedAt = null;
      } else {
        const date = new Date(updates.completedAt);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            message: "Please provide a valid completion date."
          });
        }

        updates.completedAt = date;
      }
    }

    // The ownership filter prevents editing another student's project.
    const project = await Project.findOneAndUpdate(
      { _id: id, user: req.session.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found."
      });
    }

    return res.json({
      message: "Project updated successfully.",
      project
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Project details are invalid."
      });
    }

    console.error("Update project error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to update project."
    });
  }
});

// DELETE /api/projects/:id — delete only a project owned by this student.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID."
      });
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found."
      });
    }

    return res.json({
      message: "Project deleted successfully."
    });
  } catch (error) {
    console.error("Delete project error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to delete project."
    });
  }
});

module.exports = router;

