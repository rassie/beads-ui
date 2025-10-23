/**
 * Hash-based router for tabs (issues/epics/board) and deep-linked issue ids.
 */

/**
 * Parse an application hash and extract the selected issue id.
 * @param {string} hash
 * @returns {string | null}
 */
export function parseHash(hash) {
  const m = /^#\/issue\/([^\s?#]+)/.exec(hash || '');
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

/**
 * Parse the current view from hash.
 * @param {string} hash
 * @returns {'issues'|'epics'|'board'}
 */
export function parseView(hash) {
  const h = String(hash || '');
  if (/^#\/epics(\b|\/|$)/.test(h)) {
    return 'epics';
  }
  if (/^#\/board(\b|\/|$)/.test(h)) {
    return 'board';
  }
  // Default to issues (also covers #/issues and unknown/empty)
  return 'issues';
}

/**
 * Create and start the hash router.
 * @param {{ getState: () => any, setState: (patch: any) => void }} store
 * @returns {{ start: () => void, stop: () => void, gotoIssue: (id: string) => void, gotoView: (v: 'issues'|'epics'|'board') => void }}
 */
export function createHashRouter(store) {
  /** @type {(ev?: HashChangeEvent) => any} */
  const onHashChange = () => {
    const hash = window.location.hash || '';
    const id = parseHash(hash);
    // Preserve current view when navigating to a detail route so tabs remain stable
    const current = store.getState ? store.getState() : { view: 'issues' };
    const view = id ? current.view || 'issues' : parseView(hash);
    store.setState({ selected_id: id, view });
  };

  return {
    start() {
      window.addEventListener('hashchange', onHashChange);
      onHashChange();
    },
    stop() {
      window.removeEventListener('hashchange', onHashChange);
    },
    gotoIssue(id) {
      const next = `#/issue/${encodeURIComponent(id)}`;
      if (window.location.hash !== next) {
        window.location.hash = next;
      } else {
        // Force state update even if hash is the same
        store.setState({ selected_id: id, view: 'issues' });
      }
    },
    /**
     * Navigate to a top-level view.
     * @param {'issues'|'epics'|'board'} view
     */
    gotoView(view) {
      const next = `#/${view}`;
      if (window.location.hash !== next) {
        window.location.hash = next;
      } else {
        store.setState({ view, selected_id: null });
      }
    }
  };
}
