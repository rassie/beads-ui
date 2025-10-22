/**
 * Mount a simple sample view into the given root element.
 * This is a placeholder proving jsdom/browser testing works; UI-25 will replace it.
 * @param {HTMLElement} root_element - The container element to render into.
 */
export function mountSample(root_element) {
  /** @type {HTMLHeadingElement} */
  const heading_element = document.createElement('h2');
  heading_element.textContent = 'Sample View';
  root_element.replaceChildren(heading_element);
}
