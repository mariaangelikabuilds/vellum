import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { documents, bibliography } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';

interface ExaSearchResult {
  url: string;
  title?: string;
  text?: string;
}

async function fetchPageViaExa(url: string): Promise<{ title: string; text: string } | null> {
  const r = await fetch('https://api.exa.ai/contents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls: [url], text: { maxCharacters: 20000 } }),
  });
  if (!r.ok) return null;
  const json = (await r.json()) as { results?: ExaSearchResult[] };
  const first = json.results?.[0];
  if (!first) return null;
  return { title: first.title ?? url, text: first.text ?? '' };
}

async function embedText(text: string): Promise<number[]> {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text.slice(0, 8000)], model: 'voyage-3-large' }),
  });
  const json = (await r.json()) as { data: { embedding: number[] }[] };
  if (!json.data[0]) throw new Error('Voyage returned no embedding');
  return json.data[0].embedding;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const rows = await db
    .select()
    .from(bibliography)
    .where(eq(bibliography.documentId, id))
    .orderBy(desc(bibliography.createdAt));

  return NextResponse.json({
    sources: rows.map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title,
      contentSnapshot: r.contentSnapshot?.slice(0, 240) ?? '',
      fetchedAt: r.fetchedAt,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  const { id } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (doc.orgId !== user.orgId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string };
  if (!body.url || !/^https?:\/\//.test(body.url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const fetched = await fetchPageViaExa(body.url);
  if (!fetched) {
    return NextResponse.json({ error: 'could not fetch page' }, { status: 502 });
  }

  const embedding = await embedText(fetched.text || fetched.title);

  const [row] = await db
    .insert(bibliography)
    .values({
      documentId: doc.id,
      url: body.url,
      title: fetched.title,
      contentSnapshot: fetched.text,
      embedding,
      fetchedAt: new Date(),
    })
    .returning();

  return NextResponse.json({
    source: {
      id: row?.id,
      url: row?.url,
      title: row?.title,
      contentSnapshot: (row?.contentSnapshot ?? '').slice(0, 240),
      fetchedAt: row?.fetchedAt,
    },
  });
}
