// Lightweight wrapper around the native <dialog> for issue details
// Provides: open(id), close(), getMount()
// Ensures accessibility, backdrop click to close, and Esc handling.

/**
 * @typedef {{ getState: () => { selected_id: string|null } }} Store
 */

/**
 * Create and manage the Issue Details dialog.
 * @param {HTMLElement} mount_element - Container to attach the <dialog> to (e.g., #detail-panel)
 * @param {Store} store - Read-only access to app state
 * @param {() => void} onClose - Called when dialog requests close (backdrop/esc/button)
 * @returns {{ open: (id: string) => void, close: () => void, getMount: () => HTMLElement }}
 */
export function createIssueDialog(mount_element, store, onClose) {
  /** @type {HTMLDialogElement} */
  const dialog = /** @type {any} */ (document.createElement('dialog'));
  dialog.id = 'issue-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  // Shell: header (id + close) + body mount
  dialog.innerHTML = `
    <div class="issue-dialog__container" part="container">
      <header class="issue-dialog__header">
        <div class="issue-dialog__title">
          <span class="mono" id="issue-dialog-title"></span>
        </div>
        <button type="button" class="issue-dialog__close" aria-label="Close">×</button>
      </header>
      <div class="issue-dialog__body" id="issue-dialog-body"></div>
    </div>
  `;

  mount_element.appendChild(dialog);

  /** @type {HTMLElement} */
  const body_mount = /** @type {any} */ (
    dialog.querySelector('#issue-dialog-body')
  );
  /** @type {HTMLElement} */
  const title_el = /** @type {any} */ (
    dialog.querySelector('#issue-dialog-title')
  );
  /** @type {HTMLButtonElement} */
  const btn_close = /** @type {any} */ (
    dialog.querySelector('.issue-dialog__close')
  );

  /**
   * @param {string} id
   */
  function setTitle(id) {
    // Show raw id (e.g., UI-104) for clarity in the chrome
    title_el.textContent = id || '';
  }

  // Backdrop click: when clicking the dialog itself (outside container), close
  dialog.addEventListener('mousedown', (ev) => {
    if (ev.target === dialog) {
      ev.preventDefault();
      requestClose();
    }
  });
  // Esc key produces a cancel event on <dialog>
  dialog.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    requestClose();
  });
  // Close button
  btn_close.addEventListener('click', () => requestClose());

  function requestClose() {
    try {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    } catch {
      dialog.removeAttribute('open');
    }
    try {
      onClose();
    } catch {
      // ignore consumer errors
    }
  }

  /**
   * @param {string} id
   */
  function open(id) {
    setTitle(id);
    try {
      if (
        'showModal' in dialog &&
        typeof (/** @type {any} */ (dialog).showModal) === 'function'
      ) {
        /** @type {any} */ (dialog).showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      // Focus the dialog container for keyboard users
      setTimeout(() => {
        try {
          btn_close.focus();
        } catch {
          // ignore
        }
      }, 0);
    } catch {
      // Fallback for environments without <dialog>
      dialog.setAttribute('open', '');
    }
  }

  function close() {
    try {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    } catch {
      dialog.removeAttribute('open');
    }
  }

  return {
    open,
    close,
    getMount() {
      return body_mount;
    }
  };
}
