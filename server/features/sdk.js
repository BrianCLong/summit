"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeatures = getFeatures;
const redis_1 = require("redis");
const r = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
async function getFeatures(userId) {
    const clicks = Number((await r.get(`fs:user_recent_clicks:${userId}`)) || 0);
    return { user_recent_clicks: clicks };
}
