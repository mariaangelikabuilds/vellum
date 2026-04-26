import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, subscribers, users } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export async function POST(
  _req: Request,
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
  if (!doc.published) {
    return NextResponse.json({ error: 'publish before broadcasting' }, { status: 422 });
  }
  if (!doc.authorUserId) {
    return NextResponse.json({ error: 'doc has no author' }, { status: 422 });
  }

  const subs = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.authorUserId, doc.authorUserId));

  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const [author] = await db.select().from(users).where(eq(users.id, doc.authorUserId));
  const fromName = author?.email?.split('@')[0] ?? 'a writer';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const essayUrl = `${baseUrl}/v/${doc.id}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  // Read sender from env. In production this MUST be a verified-domain address
  // (e.g. mail@vellum.dev). Falls back to Resend's dev sender for local
  // development so nobody hits a 500 in setup; logs a warning so the gap is
  // visible in observability when broadcasting from prod with the fallback.
  const fromAddress = process.env.VELLUM_FROM_EMAIL;
  const from = fromAddress ?? 'Vellum <onboarding@resend.dev>';
  if (!fromAddress) {
    console.warn(
      'broadcast: VELLUM_FROM_EMAIL not set — using onboarding@resend.dev which Resend treats as dev sender. Verify a domain in Resend dashboard for production.',
    );
  }

  // Resend supports a `to` array — one API call broadcasts to all subscribers.
  // For larger lists, paginate; for v1, single batch.
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: subs.map((s) => s.email),
      subject: doc.title,
      html: renderEssayEmailHtml({
        title: doc.title,
        proseText: doc.proseText ?? '',
        fromName,
        essayUrl,
      }),
    }),
  });

  if (!r.ok) {
    const errText = await r.text();
    return NextResponse.json(
      { error: 'resend failed', detail: errText.slice(0, 400) },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent: subs.length });
}

function renderEssayEmailHtml({
  title,
  proseText,
  fromName,
  essayUrl,
}: {
  title: string;
  proseText: string;
  fromName: string;
  essayUrl: string;
}): string {
  const paragraphs = proseText
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 1.4em;font:18px/1.6 Georgia,serif;color:#0a0a0a">${escape(p)}</p>`)
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Georgia,serif">
<div style="max-width:640px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e5e5e5">
  <p style="font:11px/1 ui-monospace,monospace;color:#a3a3a3;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 24px">verified essay · vellum</p>
  <h1 style="font:32px/1.2 Georgia,serif;color:#0a0a0a;margin:0 0 24px">${escape(title)}</h1>
  ${paragraphs}
  <p style="border-top:1px solid #e5e5e5;padding-top:16px;margin-top:32px;font:12px/1.4 ui-monospace,monospace;color:#a3a3a3">
    by ${escape(fromName)} · <a href="${essayUrl}" style="color:#0a0a0a">read with the claim graph →</a>
  </p>
</div>
</body></html>`;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
