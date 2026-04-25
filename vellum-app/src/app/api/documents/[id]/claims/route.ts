import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listClaimsForDocument } from '@/db/graph';

interface AGRow {
  id: unknown;
  text: unknown;
  type: unknown;
  confidence: unknown;
}

function unquote(v: unknown): string {
  return String(v ?? '').replace(/^"|"$/g, '');
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const rows = (await listClaimsForDocument(id)) as unknown as AGRow[];

  const claims = rows.map((r) => ({
    id: unquote(r.id),
    text: unquote(r.text),
    type: unquote(r.type),
    confidence: Number(r.confidence ?? 0),
  }));

  return NextResponse.json({ claims });
}
