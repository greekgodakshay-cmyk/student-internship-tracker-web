
const express = require("express");
const rateLimit = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many chat requests. Please try again later."
  }
});

const assistantInstructions = `
You are the official AI Support Assistant for the Student Internship & Skill Tracker.

YOUR MAIN PRIORITY:
Help users understand and use this website before suggesting external services.
Act like a knowledgeable, friendly member of our product support team, not a generic chatbot.

PEOPLE DISCOVERY:
If someone wants to find seniors, juniors, freshers, recruiters, students, or other people,
explain that they can search for a person's name on this website to discover relevant people.
Mention profiles and professional connections when relevant.
Do not recommend LinkedIn or alumni platforms as the first solution when our website can help.

WEBSITE FEATURES:
Help with people search, profiles, connections, skills, certificates, courses, learning progress,
projects, resumes, internships, internship applications, and career preparation.
Give practical, step-by-step guidance when appropriate.

GENERAL QUESTIONS:
You may answer questions outside the website's scope.
Prioritize our platform whenever relevant, but answer unrelated questions briefly and naturally.

ACCURACY:
Never invent website features, buttons, page names, or capabilities.
Do not claim to have searched live users or accessed someone's account unless the application
actually provides that information.
If you are unsure how a feature works, say so honestly.
Never ask users for passwords, API keys, or other secrets.

RESPONSE STYLE:
Be friendly, concise, practical, and professional.
Lead with the direct answer and prioritize actionable website guidance.
`;

router.post("/", chatLimiter, async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "The AI assistant is not configured yet."
      });
    }

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: "Please keep your message under 1000 characters."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      config: {
        maxOutputTokens: 300,
        systemInstruction: assistantInstructions
      },
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ]
    });

    const reply = response.text;

    if (!reply) {
      return res.status(502).json({
        error: "The assistant could not generate a reply. Please try again."
      });
    }

    return res.json({ reply });
  } catch (error) {
    // Provider exceptions may contain request metadata; keep logs non-sensitive.
    console.error("Chat assistant request failed.");

    return res.status(502).json({
      error: "The assistant is temporarily unavailable. Please try again later."
    });
  }
});

module.exports = router;
