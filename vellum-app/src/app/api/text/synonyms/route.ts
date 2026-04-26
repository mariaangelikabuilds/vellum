import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { suggestSynonyms } from '@/ai/agents/synonyms';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  word: z.string().min(1).max(80),
  sentence: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const limit = rateLimit(`synonyms:${userId}`, { tokens: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate limited — try again in a minute' }, { status: 429 });
  }

  const user = await syncCurrentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const orgId = user.orgId ?? 'no-org';
  const result = await suggestSynonyms({ ...parsed.data, orgId });
  return NextResponse.json(result);
}
