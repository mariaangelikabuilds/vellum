import { task } from '@trigger.dev/sdk';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { findContradictions, listClaimsForDocument } from '@/db/graph';
import { verifyClaim } from '@/ai/agents/verifier';
import { detectGaps } from '@/ai/agents/gap-detector';

/**
 * Background job that verifies all unverified claims in a document, then
 * audits the resulting graph for gaps. Triggered from the save-document
 * route handler. Streams updates over WebSocket (Section 7) as it progresses.
 */
export const verifyDocument = task({
  id: 'verify-document',
  retry: { maxAttempts: 3 },
  run: async ({ documentId, orgId }: { documentId: string; orgId: string }) => {
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) throw new Error(`Document ${documentId} not found`);

    const claims = await listClaimsForDocument(documentId);

    for (const claim of claims) {
      const claimId = String(claim.id).replace(/^"|"$/g, '');
      const claimText = String(claim.text).replace(/^"|"$/g, '');
      const others = claims
        .filter((c) => c.id !== claim.id)
        .map((c) => ({
          id: String(c.id).replace(/^"|"$/g, ''),
          text: String(c.text).replace(/^"|"$/g, ''),
        }));

      await verifyClaim({ claimId, claimText, documentId, orgId, otherClaims: others });
    }

    await detectGaps(claims, orgId);

    const contradictions = await findContradictions(documentId);
    await db
      .update(documents)
      .set({ contradictionCount: contradictions.length, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return {
      claimCount: claims.length,
      contradictionCount: contradictions.length,
    };
  },
});
