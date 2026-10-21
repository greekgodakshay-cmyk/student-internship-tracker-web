

require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("readline");
const User = require("./models/User");

async function makeAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) =>
    new Promise((resolve) => rl.question(question, resolve));

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    const email = (await ask("Enter your registered account email: "))
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(
        "No account found with that email. Register first and try again."
      );
    }

    if (user.role === "admin") {
      console.log("This account is already an administrator.");
      return;
    }

    const confirmation = (
      await ask(`Promote ${user.email} to administrator? Type YES to confirm: `)
    ).trim();

    if (confirmation !== "YES") {
      console.log("Cancelled. No changes were made.");
      return;
    }

    user.role = "admin";
    await user.save();

    console.log("Administrator role assigned successfully.");
    console.log("Log out and log back in to refresh your session role.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

makeAdmin();

