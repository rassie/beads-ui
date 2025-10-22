/**
 * Create a compact, colored badge for an issue type.
 * @param {string | undefined | null} issue_type - One of: bug, feature, task, epic, chore
 * @returns {HTMLSpanElement}
 */
export function createTypeBadge(issue_type) {
  /** @type {HTMLSpanElement} */
  const el = document.createElement('span');
  el.className = 'type-badge';

  /** @type {string} */
  const t = (issue_type || '').toString().toLowerCase();
  /** @type {Set<string>} */
  const KNOWN = new Set(['bug', 'feature', 'task', 'epic', 'chore']);
  const kind = KNOWN.has(t) ? t : 'neutral';
  el.classList.add(`type-badge--${kind}`);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `issue type: ${KNOWN.has(t) ? t : 'unknown'}`);
  el.setAttribute('title', KNOWN.has(t) ? `Type: ${t}` : 'Type: unknown');
  el.textContent = KNOWN.has(t) ? t : '—';
  return el;
}
