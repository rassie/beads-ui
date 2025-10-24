import { describe, expect, test } from 'vitest';
import { createBoardView } from './board.js';

describe('views/board Open column sorting', () => {
  test('sorts Open by priority asc then updated_at desc', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));

    const data = {
      async getOpen() {
        return [
          {
            id: 'O-3',
            title: 'p2 newer',
            priority: 2,
            updated_at: '2025-10-24T10:00:00.000Z'
          },
          {
            id: 'O-1',
            title: 'p0 older',
            priority: 0,
            updated_at: '2025-10-23T10:00:00.000Z'
          },
          {
            id: 'O-2',
            title: 'p2 older',
            priority: 2,
            updated_at: '2025-10-23T11:00:00.000Z'
          }
        ];
      },
      async getReady() {
        return [];
      },
      async getInProgress() {
        return [];
      },
      async getClosed() {
        return [];
      }
    };

    const view = createBoardView(mount, /** @type {any} */ (data), () => {});
    await view.load();

    const open_ids = Array.from(
      mount.querySelectorAll('#open-col .board-card .mono')
    ).map((el) => el.textContent?.trim());
    // Priority 0 first, then priority 2 items by updated_at desc
    expect(open_ids).toEqual(['#1', '#3', '#2']);
  });
});
