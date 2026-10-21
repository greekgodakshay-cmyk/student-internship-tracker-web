

const express = require("express");
const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");
const Notification = require("../models/Notification");
async function announceCourse(course) {
  const users = await User.find({}).select("_id").lean();
  if (!users.length) return;
  await Notification.insertMany(users.map(user => ({ recipient: user._id, type: "course", title: "New course published", body: course.title, targetId: course._id })), { ordered: false });
}

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  if (!mongoose.isValidObjectId(req.session.userId)) {
    return res.status(401).json({
      message: "Invalid session. Please log in again."
    });
  }

  next();
}

async function requireAdmin(req, res, next) {
  try {
    // Re-check current database role so demotion takes effect without waiting
    // for the session cookie to expire.
    const user = await User.findById(req.session.userId).select("role").lean();
    if (!user) {
      return res.status(401).json({ message: "Please log in to continue." });
    }
    req.session.role = user.role;
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Administrator access is required."
      });
    }
    return next();
  } catch {
    return res.status(503).json({ message: "Unable to verify permissions right now." });
  }
}

// GET /api/courses
// Students can view published courses.
router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const filter = { isPublished: true };
    const [courses, total] = await Promise.all([
      Course.find(filter).select("title description category level instructor lessons createdAt")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(filter)
    ]);

    return res.json({
      courses: courses.map((course) => ({ ...course, lessonCount: course.lessons.length })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Course retrieval error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to retrieve courses right now."
    });
  }
});

/* GET /api/courses/admin
   Administrators can view all courses, including drafts. */
router.get("/admin", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 100, skip: 0 };
    const [courses, total] = await Promise.all([
      Course.find({}).select("title description category level instructor lessons isPublished createdAt")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments({})
    ]);

    return res.json({
      courses: courses.map((course) => ({ ...course, lessonCount: Array.isArray(course.lessons) ? course.lessons.length : 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Admin course retrieval error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to retrieve admin courses right now."
    });
  }
});

// POST /api/courses
// Only administrators can create courses.
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      instructor,
      lessons,
      isPublished
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200
    ) {
      return res.status(400).json({
        message: "A course title of 1–200 characters is required."
      });
    }

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 2000
    ) {
      return res.status(400).json({
        message: "A course description of 1–2000 characters is required."
      });
    }

    if (
      category !== undefined &&
      (typeof category !== "string" || category.trim().length > 100)
    ) {
      return res.status(400).json({
        message: "Category must be a string of at most 100 characters."
      });
    }

    if (
      level !== undefined &&
      !["Beginner", "Intermediate", "Advanced"].includes(level)
    ) {
      return res.status(400).json({
        message: "Please select a valid course level."
      });
    }

    if (
      instructor !== undefined &&
      (typeof instructor !== "string" || instructor.trim().length > 100)
    ) {
      return res.status(400).json({
        message: "Instructor must be a string of at most 100 characters."
      });
    }

    if (lessons !== undefined && !Array.isArray(lessons)) {
      return res.status(400).json({
        message: "Lessons must be an array."
      });
    }

    if (lessons && lessons.length > 500) {
      return res.status(400).json({
        message: "A course cannot contain more than 500 lessons."
      });
    }

    if (
      isPublished !== undefined &&
      typeof isPublished !== "boolean"
    ) {
      return res.status(400).json({
        message: "isPublished must be true or false."
      });
    }

    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      category: category?.trim() || "General",
      level: level || "Beginner",
      instructor: instructor?.trim() || "",
      lessons: lessons || [],
      isPublished: isPublished === true
    });

    return res.status(201).json({
      message: "Course created successfully.",
      course
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Course data is invalid. Check the lesson details and try again."
      });
    }

    console.error("Course creation error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to create course right now."
    });
  }
});

/* POST /api/courses/:courseId/lessons
   Administrators can add a lesson to an existing course. */
router.post("/:courseId/lessons", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const { title, description, videoUrl, resourceUrl } = req.body;

    if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
      return res.status(400).json({
        message: "Lesson title is required and must be at most 200 characters."
      });
    }

    if (description !== undefined &&
        (typeof description !== "string" || description.trim().length > 1000)) {
      return res.status(400).json({ message: "Description must be at most 1000 characters." });
    }

    for (const [field, value] of [["videoUrl", videoUrl], ["resourceUrl", resourceUrl]]) {
      if (value !== undefined && typeof value !== "string") {
        return res.status(400).json({ message: `${field} must be a string.` });
      }

      if (typeof value === "string" && value.trim() &&
          !/^https?:\/\/\S+$/i.test(value.trim())) {
        return res.status(400).json({ message: `${field} must be a valid HTTP or HTTPS URL.` });
      }
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const lesson = {
      title: title.trim(),
      description: description?.trim() || "",
      videoUrl: videoUrl?.trim() || "",
      resourceUrl: resourceUrl?.trim() || "",
      order: course.lessons.length + 1
    };

    course.lessons.push(lesson);
    await course.save();

    return res.status(201).json({
      message: "Lesson added successfully.",
      lesson: course.lessons[course.lessons.length - 1],
      lessonCount: course.lessons.length
    });
  } catch (error) {
    console.error("Lesson creation error:".replace(/[: ]+$/, "") + " failed.");

    return res.status(500).json({
      message: "Unable to add lesson right now."
    });
  }
});

// Update and delete are restricted to administrators; existing lesson/progress references are preserved.
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid course ID." });
    const allowed = ["title", "description", "category", "level", "instructor", "isPublished"];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide at least one course field to update." });
    const stringLimits = { title: 200, description: 2000, category: 100, instructor: 100 };
    for (const [key, max] of Object.entries(stringLimits)) {
      if (key in updates && (typeof updates[key] !== "string" || (key !== "category" && key !== "instructor" && !updates[key].trim()) || updates[key].trim().length > max)) {
        return res.status(400).json({ message: `${key} must be a valid string of at most ${max} characters.` });
      }
      if (key in updates) updates[key] = updates[key].trim();
    }
    if ("level" in updates && !["Beginner", "Intermediate", "Advanced"].includes(updates.level)) return res.status(400).json({ message: "Please select a valid course level." });
    if ("isPublished" in updates && typeof updates.isPublished !== "boolean") return res.status(400).json({ message: "isPublished must be true or false." });
    const course = await Course.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: "Course not found." });
    res.json({ message: "Course updated.", course });
  } catch (error) { console.error("Course update error:".replace(/[: ]+$/, "") + " failed."); res.status(400).json({ message: "Unable to update course. Check the supplied fields." }); }
});

// PATCH /api/courses/:courseId/lessons/:lessonId
// Admin-only lesson editing; keeps existing lesson IDs and progress records intact.
router.patch("/:courseId/lessons/:lessonId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Invalid course or lesson ID." });
    }

    const allowed = ["title", "description", "videoUrl", "resourceUrl"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Provide at least one lesson field to update." });
    }
    if (updates.title !== undefined && (typeof updates.title !== "string" || !updates.title.trim() || updates.title.trim().length > 200)) {
      return res.status(400).json({ message: "Lesson title is required and must be at most 200 characters." });
    }
    if (updates.description !== undefined && (typeof updates.description !== "string" || updates.description.trim().length > 1000)) {
      return res.status(400).json({ message: "Lesson description must be at most 1000 characters." });
    }
    for (const key of ["videoUrl", "resourceUrl"]) {
      if (updates[key] !== undefined) {
        if (typeof updates[key] !== "string" || (updates[key].trim() && !/^https?:\/\/\S+$/i.test(updates[key].trim()))) {
          return res.status(400).json({ message: `${key} must be an HTTP or HTTPS URL.` });
        }
        updates[key] = updates[key].trim();
      }
    }
    for (const key of ["title", "description"]) if (updates[key] !== undefined) updates[key] = updates[key].trim();

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const lesson = course.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });
    Object.assign(lesson, updates);
    await course.save();
    return res.json({ message: "Lesson updated successfully.", lesson });
  } catch (error) {
    console.error("Lesson update error:".replace(/[: ]+$/, "") + " failed.");
    return res.status(500).json({ message: "Unable to update lesson right now." });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid course ID." });
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });
    // Refuse deletion when progress records reference this course, avoiding orphaned records.
    const Progress = require("../models/Progress");
    if (await Progress.exists({ course: course._id })) return res.status(409).json({ message: "This course has student progress records. Unpublish it instead to preserve history." });
    await course.deleteOne();
    res.json({ message: "Course deleted." });
  } catch (error) { console.error("Course deletion error:".replace(/[: ]+$/, "") + " failed."); res.status(500).json({ message: "Unable to delete course." }); }
});

module.exports = router;

