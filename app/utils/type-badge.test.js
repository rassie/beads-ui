import { describe, expect, test } from 'vitest';
import { createTypeBadge } from './type-badge.js';

describe('utils/type-badge', () => {
  test('renders known types with modifier class and accessible labels', () => {
    const types = ['bug', 'feature', 'task', 'epic', 'chore'];
    for (const t of types) {
      const el = createTypeBadge(t);
      expect(el.classList.contains('type-badge')).toBe(true);
      expect(el.classList.contains(`type-badge--${t}`)).toBe(true);
      expect(el.getAttribute('role')).toBe('img');
      expect((el.getAttribute('aria-label') || '').includes(t)).toBe(true);
      expect(el.textContent).toBe(t);
    }
  });

  test('falls back to neutral for unknown types', () => {
    const el = createTypeBadge('unknown');
    expect(el.classList.contains('type-badge--neutral')).toBe(true);
    expect(el.textContent).toBe('—');
  });
});
