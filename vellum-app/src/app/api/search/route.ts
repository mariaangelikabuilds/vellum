import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  if (!user.orgId) return NextResponse.json({ results: [] });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const pattern = `%${q}%`;

  // search by title, prose text, or tag overlap
  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      tags: documents.tags,
      proseText: documents.proseText,
      updatedAt: documents.updatedAt,
      claimCount: documents.claimCount,
    })
    .from(documents)
    .where(
      and(
        eq(documents.orgId, user.orgId),
        or(
          ilike(documents.title, pattern),
          ilike(documents.proseText, pattern),
          sql`${documents.tags} @> ARRAY[${q}]::text[]`,
        ),
      ),
    )
    .limit(30);

  return NextResponse.json({
    results: docs.map((d) => ({
      id: d.id,
      title: d.title,
      tags: d.tags ?? [],
      snippet: snippetAround(d.proseText ?? '', q),
      updatedAt: d.updatedAt,
      claimCount: d.claimCount ?? 0,
    })),
  });
}

function snippetAround(text: string, q: string, radius = 80): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2) + (text.length > radius * 2 ? '…' : '');
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
