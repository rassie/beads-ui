/**
 * Minimal, safe Markdown renderer that builds a DOM fragment without innerHTML.
 * Supports headings, paragraphs, lists, code blocks, inline code, and links.
 * This is intentionally conservative to avoid XSS.
 * @function renderMarkdown
 * @param {string} src Markdown source text
 * @returns {DocumentFragment}
 */
export function renderMarkdown(src) {
  /** @type {DocumentFragment} */
  const frag = document.createDocumentFragment();

  /** @type {string[]} */
  const lines = (src || '').replace(/\r\n?/g, '\n').split('\n');

  /** @type {boolean} */
  let in_code = false;
  /** @type {string[]} */
  let code_acc = [];

  /** @type {HTMLElement|null} */
  let list_el = null;
  /** @type {string} */
  let list_type = '';

  /**
   * Flush current paragraph buffer to <p> if any.
   * @param {string[]} buf
   */
  function flushParagraph(buf) {
    if (buf.length === 0) {
      return;
    }
    const p = document.createElement('p');
    appendInline(p, buf.join(' '));
    frag.appendChild(p);
    buf.length = 0;
  }

  /** @type {string[]} */
  const para = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // fenced code blocks
    if (/^```/.test(line)) {
      if (!in_code) {
        in_code = true;
        code_acc = [];
      } else {
        // flush code block
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = code_acc.join('\n');
        pre.appendChild(code);
        frag.appendChild(pre);
        in_code = false;
        code_acc = [];
      }
      continue;
    }
    if (in_code) {
      code_acc.push(raw);
      continue;
    }

    // blank line -> paragraph / list break
    if (/^\s*$/.test(line)) {
      flushParagraph(para);
      if (list_el !== null) {
        frag.appendChild(list_el);
        list_el = null;
        list_type = '';
      }
      continue;
    }

    // heading
    const hx = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hx) {
      flushParagraph(para);
      if (list_el !== null) {
        frag.appendChild(list_el);
        list_el = null;
        list_type = '';
      }
      const level = Math.min(6, hx[1].length);
      const h = /** @type {HTMLHeadingElement} */ (
        document.createElement('h' + String(level))
      );
      appendInline(h, hx[2]);
      frag.appendChild(h);
      continue;
    }

    // list item
    let m = /^\s*[-*]\s+(.*)$/.exec(line);
    if (m) {
      if (list_el === null || list_type !== 'ul') {
        flushParagraph(para);
        if (list_el !== null) {
          frag.appendChild(list_el);
        }
        list_el = document.createElement('ul');
        list_type = 'ul';
      }
      const li = document.createElement('li');
      appendInline(li, m[1]);
      list_el.appendChild(li);
      continue;
    }
    m = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (m) {
      if (list_el === null || list_type !== 'ol') {
        flushParagraph(para);
        if (list_el !== null) {
          frag.appendChild(list_el);
        }
        list_el = document.createElement('ol');
        list_type = 'ol';
      }
      const li = document.createElement('li');
      appendInline(li, m[2]);
      list_el.appendChild(li);
      continue;
    }

    // otherwise: paragraph text; accumulate to join with spaces
    para.push(line.trim());
  }

  // flush leftovers
  if (in_code) {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = code_acc.join('\n');
    pre.appendChild(code);
    frag.appendChild(pre);
  }
  flushParagraph(para);
  if (list_el !== null) {
    frag.appendChild(list_el);
  }

  return frag;

  /**
   * Append inline content parsing backticks and links safely.
   * - Inline code: `text`
   * - Links: [text](url) where url starts with http, https, or mailto
   * @param {HTMLElement} el
   * @param {string} text
   */
  function appendInline(el, text) {
    /** @type {RegExp} */
    const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
    /** @type {number} */
    let last = 0;
    /** @type {any} */
    let match = re.exec(text);
    while (match) {
      const idx = match.index;
      if (idx > last) {
        el.appendChild(document.createTextNode(text.slice(last, idx)));
      }
      const token = match[0];
      if (token[0] === '\u0060') {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        el.appendChild(code);
      } else if (token[0] === '[') {
        // parse [text](url)
        const m2 = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
        if (m2) {
          const a = document.createElement('a');
          const href = m2[2].trim();
          const allowed = /^(https?:|mailto:)/i.test(href);
          if (allowed) {
            a.setAttribute('href', href);
          } else {
            // if not allowed, render as text to avoid XSS vectors
            a.remove();
            el.appendChild(document.createTextNode(m2[1] + ' (' + href + ')'));
            last = re.lastIndex;
            match = re.exec(text);
            continue;
          }
          a.appendChild(document.createTextNode(m2[1]));
          el.appendChild(a);
        }
      }
      last = re.lastIndex;
      match = re.exec(text);
    }
    if (last < text.length) {
      el.appendChild(document.createTextNode(text.slice(last)));
    }
  }
}
