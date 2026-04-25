import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { checkIfAiGenerated } from '@/ai/agents/ai-detector';
import { syncCurrentUser } from '@/lib/auth/sync-user';

const Body = z.object({
  text: z.string().min(50).max(20000),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid body — need at least 50 chars' }, { status: 400 });

  const orgId = user.orgId ?? 'no-org';
  const result = await checkIfAiGenerated({ text: parsed.data.text, orgId });
  return NextResponse.json(result);
}
