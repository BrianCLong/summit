import { NextResponse } from "next/server";
import { z } from "zod";

const EventSchema = z.object({
  name: z.string().min(1),
  ts: z.number().int(),
  path: z.string().min(1),
  ref: z.string().optional(),
  props: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = EventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  console.log("analytics_event", parsed.data);

  return NextResponse.json({ ok: true });
}
