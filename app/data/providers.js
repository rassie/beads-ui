/**
 * @import { MessageType } from '../protocol.js'
 */
/**
 * Data layer: typed wrappers around the ws transport for bd-backed queries.
 * @param {(type: MessageType, payload?: unknown) => Promise<unknown>} transport - Request/response function.
 * @param {(type: MessageType, handler: (payload: unknown) => void) => void} [onEvent] - Optional event subscription (used to invalidate caches on push updates).
 * @returns {{ getEpicStatus: () => Promise<unknown[]>, getReady: () => Promise<unknown[]>, getOpen: () => Promise<unknown[]>, getInProgress: () => Promise<unknown[]>, getClosed: (limit?: number) => Promise<unknown[]>, getIssue: (id: string) => Promise<unknown>, updateIssue: (input: { id: string, title?: string, acceptance?: string, notes?: string, status?: 'open'|'in_progress'|'closed', priority?: number, assignee?: string }) => Promise<unknown> }}
 */
export function createDataLayer(transport, onEvent) {
  /** @type {{ list_ready?: unknown, list_open?: unknown, list_in_progress?: unknown, list_closed_10?: unknown, epic_status?: unknown }} */
  const cache = {};

  // Invalidate caches on server push updates when available
  if (onEvent) {
    try {
      onEvent('issues-changed', () => {
        cache.list_ready = undefined;
        cache.list_open = undefined;
        cache.list_in_progress = undefined;
        cache.list_closed_10 = undefined;
        cache.epic_status = undefined;
      });
    } catch {
      // noop
    }
  }

  /**
   * Get epic status groups via `bd epic status --json`.
   * @returns {Promise<unknown[]>}
   */
  async function getEpicStatus() {
    if (Array.isArray(cache.epic_status)) {
      return cache.epic_status;
    }
    const res = await transport('epic-status');
    const arr = Array.isArray(res) ? res : [];
    cache.epic_status = arr;
    return arr;
  }

  /**
   * Ready issues: `bd ready --json`.
   * Sort by priority then updated_at on the UI; transport returns raw list.
   * @returns {Promise<unknown[]>}
   */
  async function getReady() {
    if (Array.isArray(cache.list_ready)) {
      return cache.list_ready;
    }
    /** @type {unknown} */
    const res = await transport('list-issues', { filters: { ready: true } });
    const arr = Array.isArray(res) ? res : [];
    cache.list_ready = arr;
    return arr;
  }

  /**
   * Open issues: `bd list -s open --json`.
   * @returns {Promise<unknown[]>}
   */
  async function getOpen() {
    if (Array.isArray(cache.list_open)) {
      return cache.list_open;
    }
    const res = await transport('list-issues', {
      filters: { status: 'open' }
    });
    const arr = Array.isArray(res) ? res : [];
    cache.list_open = arr;
    return arr;
  }

  /**
   * In progress issues: `bd list -s in_progress --json`.
   * @returns {Promise<unknown[]>}
   */
  async function getInProgress() {
    if (Array.isArray(cache.list_in_progress)) {
      return cache.list_in_progress;
    }
    const res = await transport('list-issues', {
      filters: { status: 'in_progress' }
    });
    const arr = Array.isArray(res) ? res : [];
    cache.list_in_progress = arr;
    return arr;
  }

  /**
   * Closed issues: `bd list -s closed -l 10 --json`.
   * @param {number} [limit] - Optional limit (defaults to 10).
   * @returns {Promise<unknown[]>}
   */
  async function getClosed(limit = 10) {
    if (limit === 10 && Array.isArray(cache.list_closed_10)) {
      return cache.list_closed_10;
    }
    const res = await transport('list-issues', {
      filters: { status: 'closed', limit }
    });
    const arr = Array.isArray(res) ? res : [];
    if (limit === 10) {
      cache.list_closed_10 = arr;
    }
    return arr;
  }

  /**
   * Show a single issue via `bd show <id> --json`.
   * @param {string} id
   * @returns {Promise<unknown>}
   */
  async function getIssue(id) {
    /** @type {unknown} */
    const res = await transport('show-issue', { id });
    return res;
  }

  /**
   * Update issue fields by dispatching specific mutations.
   * Supported fields: title, acceptance, notes, status, priority, assignee.
   * Returns the updated issue on success.
   * @param {{ id: string, title?: string, acceptance?: string, notes?: string, status?: 'open'|'in_progress'|'closed', priority?: number, assignee?: string }} input
   * @returns {Promise<unknown>}
   */
  async function updateIssue(input) {
    const { id } = input;
    /** @type {unknown} */
    let last = null;
    if (typeof input.title === 'string') {
      last = await transport('edit-text', {
        id,
        field: 'title',
        value: input.title
      });
    }
    if (typeof input.acceptance === 'string') {
      last = await transport('edit-text', {
        id,
        field: 'acceptance',
        value: input.acceptance
      });
    }
    if (typeof input.notes === 'string') {
      last = await transport('edit-text', {
        id,
        field: 'notes',
        value: input.notes
      });
    }
    if (typeof input.status === 'string') {
      last = await transport('update-status', {
        id,
        status: input.status
      });
    }
    if (typeof input.priority === 'number') {
      last = await transport('update-priority', {
        id,
        priority: input.priority
      });
    }
    // type updates are not supported via UI
    if (typeof input.assignee === 'string') {
      last = await transport('update-assignee', {
        id,
        assignee: input.assignee
      });
    }
    return last;
  }

  return {
    getEpicStatus,
    getReady,
    getOpen,
    getInProgress,
    getClosed,
    getIssue,
    updateIssue
  };
}
