

const express = require("express");
const mongoose = require("mongoose");
const Internship = require("../models/Internship");
const User = require("../models/User");
const Notification = require("../models/Notification");
async function announceInternship(listing) {
  const users = await User.find({}).select("_id").lean();
  if (users.length) await Notification.insertMany(users.map(user => ({ recipient: user._id, type: "internship", title: "New internship opening", body: `${listing.title} · ${listing.company}`, targetId: listing._id })), { ordered: false });
}

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.session.userId).select("role").lean();
    if (!user) {
      return res.status(401).json({ message: "Please log in to continue." });
    }
    req.session.role = user.role;
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Only administrators can manage internship listings."
      });
    }
    return next();
  } catch {
    return res.status(503).json({ message: "Unable to verify permissions right now." });
  }
}

function validUrl(value) {
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

// All internship routes require login.
router.use(requireAuth);

// GET /api/internships — students can browse active internships.
// Admins can see all listings using ?all=true.
router.get("/", async (req, res) => {
  try {
    let canViewAll = false;
    if (req.query.all === "true") {
      const currentUser = await User.findById(req.session.userId).select("role").lean();
      canViewAll = currentUser?.role === "admin";
      if (canViewAll) req.session.role = "admin";
    }
    const filter = canViewAll ? {} : { isActive: true };

    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const [internships, total] = await Promise.all([
      Internship.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Internship.countDocuments(filter)
    ]);

    return res.json({ internships, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Fetch internships error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to retrieve internships."
    });
  }
});

// POST /api/internships — administrators create listings.
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      company,
      description,
      location,
      workMode,
      requiredSkills,
      applicationUrl,
      deadline,
      isActive
    } = req.body;

    if (
      typeof title !== "string" || !title.trim() || title.trim().length > 200 ||
      typeof company !== "string" || !company.trim() || company.trim().length > 150 ||
      typeof description !== "string" || !description.trim() || description.trim().length > 3000
    ) {
      return res.status(400).json({
        message: "Valid title, company, and description are required."
      });
    }

    if (!validUrl(applicationUrl)) {
      return res.status(400).json({
        message: "Application URL must be a valid HTTP or HTTPS URL."
      });
    }

    const modes = ["Remote", "On-site", "Hybrid", "Not specified"];

    if (workMode !== undefined && !modes.includes(workMode)) {
      return res.status(400).json({
        message: "Invalid work mode."
      });
    }

    if (
      requiredSkills !== undefined &&
      (!Array.isArray(requiredSkills) ||
        requiredSkills.length > 50 ||
        requiredSkills.some(
          skill => typeof skill !== "string" || !skill.trim() || skill.trim().length > 100
        ))
    ) {
      return res.status(400).json({
        message: "Required skills must be an array of up to 50 valid skill names."
      });
    }

    let cleanDeadline = null;

    if (deadline !== undefined && deadline !== null && deadline !== "") {
      cleanDeadline = new Date(deadline);

      if (Number.isNaN(cleanDeadline.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid deadline."
        });
      }
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false."
      });
    }

    const internship = await Internship.create({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      location: typeof location === "string" ? location.trim() : "Not specified",
      workMode: workMode || "Not specified",
      requiredSkills: (requiredSkills || []).map(skill => skill.trim()),
      applicationUrl,
      deadline: cleanDeadline,
      isActive: isActive === undefined ? true : isActive
    });

    return res.status(201).json({
      message: "Internship created successfully.",
      internship
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Internship details are invalid."
      });
    }

    console.error("Create internship error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to create internship."
    });
  }
});

// PATCH /api/internships/:id/active — admins activate/deactivate a listing.
router.patch("/:id/active", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid internship ID."
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false."
      });
    }

    const internship = await Internship.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    );

    if (!internship) {
      return res.status(404).json({
        message: "Internship not found."
      });
    }

    return res.json({
      message: "Internship status updated.",
      internship
    });
  } catch (error) {
    console.error("Update internship status error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({
      message: "Unable to update internship status."
    });
  }
});


// Full listing edits and deletion are administrator-only. Applications are retained on delete only if no records reference it.
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid internship ID." });
    const allowed = ["title", "company", "description", "location", "workMode", "requiredSkills", "applicationUrl", "deadline", "isActive"];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide at least one field to update." });
    const stringLimits = { title: 200, company: 150, description: 3000, location: 160 };
    for (const [key, max] of Object.entries(stringLimits)) {
      if (key in updates && (typeof updates[key] !== "string" || !updates[key].trim() || updates[key].trim().length > max)) {
        return res.status(400).json({ message: `${key} must be a non-empty string of at most ${max} characters.` });
      }
      if (key in updates) updates[key] = updates[key].trim();
    }
    if ("workMode" in updates && !["Remote", "On-site", "Hybrid", "Not specified"].includes(updates.workMode)) {
      return res.status(400).json({ message: "Invalid work mode." });
    }
    if ("requiredSkills" in updates && (!Array.isArray(updates.requiredSkills) || updates.requiredSkills.length > 50 || updates.requiredSkills.some(v => typeof v !== "string" || !v.trim() || v.trim().length > 100))) {
      return res.status(400).json({ message: "Required skills must be an array of up to 50 valid skill names." });
    }
    if ("requiredSkills" in updates) updates.requiredSkills = updates.requiredSkills.map(v => v.trim());
    if ("applicationUrl" in updates && !validUrl(updates.applicationUrl)) {
      return res.status(400).json({ message: "Application URL must be a valid HTTP or HTTPS URL." });
    }
    if ("deadline" in updates && updates.deadline !== null && updates.deadline !== "") {
      const parsedDeadline = new Date(updates.deadline);
      if (Number.isNaN(parsedDeadline.getTime())) return res.status(400).json({ message: "Please provide a valid deadline." });
      updates.deadline = parsedDeadline;
    } else if ("deadline" in updates) updates.deadline = null;
    if ("isActive" in updates && typeof updates.isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false." });
    }
    const listing = await Internship.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!listing) return res.status(404).json({ message: "Internship not found." });
    res.json({ message: "Internship updated.", internship: listing });
  } catch (error) { console.error("Internship update error:".replace(/[: ]+$/, "") + " failed."); res.status(400).json({ message: "Unable to update internship. Check the supplied fields." }); }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid internship ID." });
    const Application = require("../models/Application");
    if (await Application.exists({ internship: req.params.id })) return res.status(409).json({ message: "Applications reference this listing. Deactivate it instead to preserve application history." });
    const listing = await Internship.findByIdAndDelete(req.params.id);
    if (!listing) return res.status(404).json({ message: "Internship not found." });
    res.json({ message: "Internship deleted." });
  } catch (error) { console.error("Internship deletion error:".replace(/[: ]+$/, "") + " failed."); res.status(500).json({ message: "Unable to delete internship." }); }
});

module.exports = router;

