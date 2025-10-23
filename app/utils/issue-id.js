/**
 * Format a beads issue id as a user-facing display string `#${n}`.
 * Extracts the trailing numeric portion of the id and prefixes with '#'.
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function issueDisplayId(id) {
  const m = String(id || '').match(/(\d+)$/);
  return m ? `#${m[1]}` : '#';
}
