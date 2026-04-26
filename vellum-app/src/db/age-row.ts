/**
 * AGE returns Cypher values via the `agtype` SQL type, which serializes
 * JSON literally — strings come back as `'"hello"'` (quoted), numbers as
 * `'42'`, booleans as `'true'`. The relational driver hands us these as
 * raw strings inside `Record<string, unknown>` rows.
 *
 * `unquote` strips the leading/trailing double quotes that come back on
 * agtype string values. Keep at the boundary so app code sees clean strings.
 */

export type AgtypeRow = Record<string, unknown>;

export function unquote(value: unknown): string {
  return String(value ?? '').replace(/^"|"$/g, '');
}

/** Convenience: cast Drizzle's unknown row array to our AGE row alias. */
export function asAgtypeRows(rows: unknown[]): AgtypeRow[] {
  return rows as AgtypeRow[];
}
