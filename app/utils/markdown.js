import DOMPurify from 'dompurify';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { marked } from 'marked';

/**
 * Render Markdown safely as HTML using marked and DOMPurify.
 * Returns a lit-html TemplateResult via the unsafeHTML directive so it can be
 * embedded directly in templates.
 * @function renderMarkdown
 * @param {string} src Markdown source text
 * @returns {import('lit-html').TemplateResult}
 */
export function renderMarkdown(src) {
  /** @type {string} */
  const markdown = String(src || '');
  /** @type {string} */
  const parsed = /** @type {string} */ (marked.parse(markdown));
  /** @type {string} */
  const html_string = DOMPurify.sanitize(parsed);
  return html`${unsafeHTML(html_string)}`;
}
