/**
 * Pull JSON content out of an LLM response that may have wrapped it in
 * markdown code fences despite system-prompt instructions. Haiku does this
 * about 1-2% of the time; Sonnet less often but still occasionally.
 *
 * Returns the trimmed body of the first ```json ... ``` block, or the trimmed
 * raw input if no fence is found.
 */
export function stripFences(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fenceMatch?.[1] ?? raw.trim();
}
