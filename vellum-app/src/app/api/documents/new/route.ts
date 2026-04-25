import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  if (!user.orgId) {
    return NextResponse.json(
      { error: 'no active org — switch or create one' },
      { status: 400 },
    );
  }

  const [doc] = await db
    .insert(documents)
    .values({ orgId: user.orgId, authorUserId: user.id, title: 'Untitled' })
    .returning();
  if (!doc) return NextResponse.json({ error: 'insert failed' }, { status: 500 });

  return NextResponse.json({ id: doc.id });
}
