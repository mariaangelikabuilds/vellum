import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { checkIntent } from '@/ai/agents/intent-checker';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  text: z.string().min(1).max(20000),
  intent: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const limit = rateLimit(`intent-check:${userId}`, { tokens: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } });
  }

  const user = await syncCurrentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const orgId = user.orgId ?? 'no-org';
  const result = await checkIntent({
    text: parsed.data.text,
    intent: parsed.data.intent,
    orgId,
  });
  return NextResponse.json(result);
}
