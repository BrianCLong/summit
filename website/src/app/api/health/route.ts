import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'topicality-website',
    timestamp: new Date().toISOString(),
  });
}
