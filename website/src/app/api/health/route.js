"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
function GET() {
    return server_1.NextResponse.json({ ok: true, service: "topicality-website" });
}
