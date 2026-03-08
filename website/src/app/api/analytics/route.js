"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const zod_1 = require("zod");
const EventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    ts: zod_1.z.number().int(),
    path: zod_1.z.string().min(1),
    ref: zod_1.z.string().optional(),
    props: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()])).optional()
});
async function POST(req) {
    const json = await req.json().catch(() => null);
    const parsed = EventSchema.safeParse(json);
    if (!parsed.success)
        return server_1.NextResponse.json({ ok: false }, { status: 400 });
    console.log("analytics_event", parsed.data);
    return server_1.NextResponse.json({ ok: true });
}
