"use strict";

const mongoose = require("mongoose");

async function connectDB() {
  try {
    const tlsEnabled = process.env.MONGODB_TLS !== "false";
    if (process.env.NODE_ENV === "production" && !tlsEnabled) {
      throw new Error("TLS must be enabled for production MongoDB connections.");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      tls: tlsEnabled,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
      waitQueueTimeoutMS: 10000,
      autoIndex: process.env.NODE_ENV !== "production"
    });
    console.log("MongoDB connected successfully with configured TLS.");
  } catch {
    // Do not log raw driver errors; they can include hosts and configuration details.
    console.error("MongoDB connection failed. Verify TLS, connectivity, and environment configuration.");
    process.exit(1);
  }
}

module.exports = connectDB;
