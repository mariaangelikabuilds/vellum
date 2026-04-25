import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { explainPhrase } from '@/ai/agents/explainer';
import { syncCurrentUser } from '@/lib/auth/sync-user';

const Body = z.object({
  phrase: z.string().min(1).max(2000),
  context: z.string().min(1).max(8000),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const orgId = user.orgId ?? 'no-org';
  const result = await explainPhrase({ ...parsed.data, orgId });
  return NextResponse.json(result);
}
