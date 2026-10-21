

const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, ageConsent, termsConsent } = req.body;

    if (ageConsent !== true || termsConsent !== true) {
      return res.status(400).json({
        message: "Please confirm the age requirement and accept the Terms of Service and Privacy Policy."
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be between 1 and 100 characters."
      });
    }

    // Validate email format
    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: "Please provide a valid email address."
      });
    }

    // bcrypt only processes up to 72 bytes
    if (
      password.length < 8 ||
      password.length > 72 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Password must be 8–72 characters and at most 72 bytes."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "student"
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration failed due to a server-side error.");

    return res.status(500).json({
      message: "Unable to create account right now."
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    // Same response for unknown email and incorrect password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Regenerate session to help prevent session fixation
    req.session.regenerate((error) => {
      if (error) {
        console.error("Session regeneration failed.");

        return res.status(500).json({
          message: "Unable to start your session."
        });
      }

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session persistence failed.");

          return res.status(500).json({
            message: "Unable to save your session."
          });
        }

        return res.json({
          message: "Login successful.",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      });
    });
  } catch (error) {
    console.error("Login failed due to a server-side error.");

    return res.status(500).json({
      message: "Unable to log in right now."
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      message: "Logged out successfully."
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout failed due to a session-store error.");

      return res.status(500).json({
        message: "Unable to log out right now."
      });
    }

    res.clearCookie("sit.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    return res.json({
      message: "Logged out successfully."
    });
  });
});

// GET /api/auth/me — retrieve the logged-in user's profile
router.get("/me", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in to continue."
      });
    }

    const user = await User.findById(req.session.userId)
      .select("+photoData");

    if (!user) {
      return res.status(401).json({
        message: "User account not found. Please log in again."
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        age: user.age,
        professionType: user.professionType || "student",
        college: user.college || "",
        degree: user.degree || "",
        studyYear: user.studyYear || "",
        fieldOfStudy: user.fieldOfStudy || "",
        location: user.location || "",
        hobbies: user.hobbies || "",
        bio: user.bio || "",
        photoData: user.photoData || "",
        publicProfile: user.publicProfile === true
      }
    });
  } catch (error) {
    console.error("Profile retrieval failed.");

    return res.status(500).json({
      message: "Unable to retrieve your profile right now."
    });
  }
});

// PATCH /api/auth/me — update only the signed-in user's editable profile fields
router.patch("/me", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in to continue."
      });
    }

    const body = req.body || {};
    const allowedProfessionTypes = [
      "student",
      "working professional",
      "freelancer",
      "other"
    ];

    let age = null;
    if (body.age !== "" && body.age !== null && body.age !== undefined) {
      age = Number(body.age);
      if (!Number.isInteger(age) || age < 13 || age > 120) {
        return res.status(400).json({
          message: "Age must be a whole number between 13 and 120."
        });
      }
    }

    const professionType = body.professionType || "student";
    if (!allowedProfessionTypes.includes(professionType)) {
      return res.status(400).json({
        message: "Choose a valid profession."
      });
    }

    const fields = [
      ["college", 160],
      ["degree", 120],
      ["studyYear", 60],
      ["fieldOfStudy", 120],
      ["location", 120],
      ["hobbies", 300],
      ["bio", 600]
    ];

    const updates = { age, professionType };
    // Keep a known minor's profile private even if visibility was previously public.
    if (age !== null && age < 18) updates.publicProfile = false;

    for (const [field, maxLength] of fields) {
      const value = body[field] === undefined ? "" : body[field];
      if (typeof value !== "string") {
        return res.status(400).json({
          message: `Invalid value for ${field}.`
        });
      }
      const cleanValue = value.trim();
      if (cleanValue.length > maxLength) {
        return res.status(400).json({
          message: `${field} must be ${maxLength} characters or fewer.`
        });
      }
      updates[field] = cleanValue;
    }

    if (body.photoData !== undefined) {
      if (typeof body.photoData !== "string") {
        return res.status(400).json({
          message: "Invalid profile photo."
        });
      }

      if (body.photoData === "") {
        updates.photoData = "";
      } else {
        const photoPattern = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
        const match = body.photoData.match(photoPattern);

        if (!match) {
          return res.status(400).json({
            message: "Photo must be a PNG, JPG, or WebP image."
          });
        }

        const imageBytes = Buffer.from(match[2], "base64");
        if (!imageBytes.length || imageBytes.length > 850 * 1024) {
          return res.status(400).json({
            message: "Profile photos must be 850 KB or smaller."
          });
        }
        // Check the file signature as well as the declared MIME type. This is
        // not a full image decoder, but rejects obvious non-image payloads.
        const mime = match[1].toLowerCase();
        const isPng = mime === "png" && imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isJpeg = mime === "jpeg" && imageBytes.length >= 3 && imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
        const isWebp = mime === "webp" && imageBytes.length >= 12 && imageBytes.toString("ascii", 0, 4) === "RIFF" && imageBytes.toString("ascii", 8, 12) === "WEBP";
        if (!isPng && !isJpeg && !isWebp) {
          return res.status(400).json({ message: "Photo content does not match its declared image type." });
        }

        updates.photoData = body.photoData;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("+photoData");

    if (!user) {
      return res.status(401).json({
        message: "User account not found. Please log in again."
      });
    }

    return res.json({
      message: "Profile saved successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        age: user.age,
        professionType: user.professionType,
        college: user.college || "",
        degree: user.degree || "",
        studyYear: user.studyYear || "",
        fieldOfStudy: user.fieldOfStudy || "",
        location: user.location || "",
        hobbies: user.hobbies || "",
        bio: user.bio || "",
        photoData: user.photoData || "",
        publicProfile: user.publicProfile === true
      }
    });
  } catch (error) {
    console.error("Profile update failed.");

    return res.status(500).json({
      message: "Unable to save your profile right now."
    });
  }
});

module.exports = router;

