// Shared scoring logic for the claim detector, imported by both the Braintrust
// eval (dashboard reporting) and the CI gate (pass/fail). Kept in one place so
// the number on the dashboard and the number the gate enforces cannot drift.

export interface ExpectedClaim {
  text: string;
  type: string;
  confidence_min: number;
}

export interface DatasetRow {
  input: string;
  expected: { claims: ExpectedClaim[] };
}

export interface DetectedClaim {
  text: string;
  type: string;
  confidence: number;
  position: [number, number];
}

// Expected spans are hand-labelled and the model rarely reproduces them
// verbatim, so a claim is "found" when the model's text contains the first 30
// characters of the label.
function findByText(outClaims: DetectedClaim[], exp: ExpectedClaim): DetectedClaim | undefined {
  return outClaims.find((c) => c.text.toLowerCase().includes(exp.text.toLowerCase().slice(0, 30)));
}

export function claimCountMatch(output: DetectedClaim[], expected: DatasetRow['expected']): number {
  return output.length === expected.claims.length ? 1 : 0;
}

export function typeMatch(output: DetectedClaim[], expected: DatasetRow['expected']): number {
  const expClaims = expected.claims;
  if (expClaims.length === 0) return 1;
  let matches = 0;
  for (const exp of expClaims) {
    const found = findByText(output, exp);
    if (found && found.type === exp.type) matches++;
  }
  return matches / expClaims.length;
}

export function confidenceAboveMin(
  output: DetectedClaim[],
  expected: DatasetRow['expected'],
): number {
  const expClaims = expected.claims;
  if (expClaims.length === 0) return 1;
  let matches = 0;
  for (const exp of expClaims) {
    const found = findByText(output, exp);
    if (found && found.confidence >= exp.confidence_min) matches++;
  }
  return matches / expClaims.length;
}

export const SCORERS = {
  claim_count_match: claimCountMatch,
  type_match: typeMatch,
  confidence_above_min: confidenceAboveMin,
} as const;

export type ScoreName = keyof typeof SCORERS;
