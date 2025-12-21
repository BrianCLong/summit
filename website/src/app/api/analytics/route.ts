import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logAnalyticsEvent } from '@/lib/analytics/server';

const EventSchema = z.object({
  name: z.string().min(1),
  ts: z.number().int(),
  path: z.string().min(1),
  ref: z.string().optional(),
  props: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = EventSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Log the analytics event
    logAnalyticsEvent({
      name: parsed.data.name as 'page_view' | 'nav_click' | 'cta_click' | 'outbound_click' | 'section_view' | 'scroll_milestone' | 'error_client',
      ts: parsed.data.ts,
      path: parsed.data.path,
      ref: parsed.data.ref,
      props: parsed.data.props,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
