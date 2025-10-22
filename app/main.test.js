import { describe, expect, test } from 'vitest';
import { mountSample } from './main.js';

describe('app/main (jsdom)', () => {
  test('renders heading into root', () => {
    document.body.innerHTML = '<div id="root"></div>';
    /** @type {HTMLElement} */
    const root_element = /** @type {HTMLElement} */ (document.getElementById('root'));

    mountSample(root_element);

    const heading_element = root_element.querySelector('h2');
    if (!heading_element) {
      throw new Error('Expected heading to be rendered');
    }
    expect(heading_element.textContent).toBe('Sample View');
  });
});
