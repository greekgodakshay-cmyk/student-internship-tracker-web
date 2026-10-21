"use strict";

const session = require("express-session");
const mongoose = require("mongoose");

/**
 * Minimal MongoDB-backed express-session store using the already-configured
 * Mongoose connection. Session records expire automatically through a TTL index.
 * The session payload is server-side only; never put credentials in it.
 */
class MongoSessionStore extends session.Store {
  constructor({ collectionName = "app_sessions" } = {}) {
    super();
    this.collectionName = collectionName;
    this.collection = null;
    this.indexPromise = null;
  }

  _getCollection() {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB must be connected before using the session store.");
    }
    if (!this.collection) {
      this.collection = mongoose.connection.collection(this.collectionName);
      this.indexPromise = this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "session_expiry_ttl" }
      );
    }
    return this.collection;
  }

  async _ready() {
    const collection = this._getCollection();
    await this.indexPromise;
    return collection;
  }

  get(sid, callback) {
    this._ready()
      .then(async (collection) => {
        const record = await collection.findOne({ _id: sid, expiresAt: { $gt: new Date() } });
        callback(null, record ? record.session : null);
      })
      .catch(callback);
  }

  set(sid, sessionData, callback = () => {}) {
    this._ready()
      .then(async (collection) => {
        const expiresAt = sessionData.cookie && sessionData.cookie.expires
          ? new Date(sessionData.cookie.expires)
          : new Date(Date.now() + 8 * 60 * 60 * 1000);
        await collection.updateOne(
          { _id: sid },
          { $set: { session: sessionData, expiresAt } },
          { upsert: true }
        );
        callback(null);
      })
      .catch(callback);
  }

  touch(sid, sessionData, callback = () => {}) {
    this._ready()
      .then(async (collection) => {
        const expiresAt = sessionData.cookie && sessionData.cookie.expires
          ? new Date(sessionData.cookie.expires)
          : new Date(Date.now() + 8 * 60 * 60 * 1000);
        return collection.updateOne({ _id: sid }, { $set: { expiresAt } });
      })
      .then(() => callback(null))
      .catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this._ready()
      .then((collection) => collection.deleteOne({ _id: sid }))
      .then(() => callback(null))
      .catch(callback);
  }

  clear(callback = () => {}) {
    this._ready()
      .then((collection) => collection.deleteMany({}))
      .then(() => callback(null))
      .catch(callback);
  }
}

module.exports = MongoSessionStore;
