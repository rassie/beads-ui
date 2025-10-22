/**
 * Hash-based router that syncs the selected issue id with the store.
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
 * Create and start the hash router.
 * @param {{ getState: () => any, setState: (patch: any) => void }} store
 * @returns {{ start: () => void, stop: () => void, gotoIssue: (id: string) => void }}
 */
export function createHashRouter(store) {
  /** @type {(ev?: HashChangeEvent) => any} */
  const onHashChange = () => {
    const id = parseHash(window.location.hash || '');
    store.setState({ selected_id: id });
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
        store.setState({ selected_id: id });
      }
    }
  };
}
