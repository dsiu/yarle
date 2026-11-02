import { JSDOM } from 'jsdom';

import { getTurndownService } from './utils/turndown-service';
import { NoteData } from './models/NoteData';
import { YarleOptions } from './YarleOptions';
import { OutputFormat } from './output-format';
import { performRegexpOnContent } from './utils/get-title';
import { fencesItself } from './utils/turndown-rules/replace-monospace-code-block';

const unwrapElement = (node: Element) => {
    node.replaceWith(...Array.from(node.children));
};

const swapParent = (wrapper: Element) => {
    const inner = wrapper.parentElement;
    inner.replaceWith(...Array.from(inner.childNodes));
    inner.append(...Array.from(wrapper.childNodes));
    wrapper.appendChild(inner);
};

const fixTasks = (node: HTMLElement) => {
    // fix bold or italic breaking a task's syntax
    // i.e. '*[] foo*' instead of '[] *foo*'
    const spanTasks = Array.from(node.querySelectorAll('span>en-todo'));
    spanTasks.forEach(swapParent);
    // fix an anchor breaking a task's syntax
    // i.e. '[] [foo](bar)' instead of '[[] foo](bar)'
    const anchorTasks = Array.from(node.querySelectorAll('a>en-todo'));
    anchorTasks.forEach(swapParent);

    return node;
};
// Wraps the content of each bare <li> in a <div>. It added `</div>` to every `</li>` but `<div>` only
// after a bare `<li>`, so an item with attributes (web clips: `<li style=…>`) got a stray `</div>`
// that closed an enclosing <div> early, and the parser flattened the nested list into its parent
// ("1. * name", "2. Posted …"). Only the `</li>` of a wrapped item closes the wrapper now.
const fixSublistsInContent = (content: string): string => {
    const wrapped: Array<boolean> = [];
    let cont = content.replace(/<li\b[^>]*>|<\/li>/g, tag => {
        if (tag === '</li>') {
            return wrapped.pop() ? '</div></li>' : tag;
        }
        wrapped.push(tag === '<li>');

        return tag === '<li>' ? '<li><div>' : tag;
    });
    cont = cont.replace(/<li><div>(\s)*<div>/g, '<li><div>');
    cont = cont.replace(/<\/div>(\s)*<\/div><\/li>/g, '</div></li>');

    return cont;
};

const fixSublists = (node: HTMLElement) => {
    const ulElements: Array<HTMLElement> = Array.from(node.getElementsByTagName('ul'));
    const olElements: Array<HTMLElement> = Array.from(node.getElementsByTagName('ol'));
    const listElements = ulElements.concat(olElements);

    listElements.forEach(listNode => {
        // Unwrap Evernote's empty wrapper item (<li><ul>…</ul></li>) only. An item with its own
        // text (<li><div>text</div><ul>…</ul></li>) keeps it: replacing it dropped that text.
        const parentItem = listNode.parentElement;
        if (parentItem.tagName === 'LI' && Array.from(parentItem.childNodes)
            .every(child => child === listNode || (child.textContent || '').trim() === '')) {
            parentItem.replaceWith(listNode);
        }
        if (
            listNode.previousElementSibling &&
            listNode.previousElementSibling.tagName === 'LI'
        ) {
            // The below moves, not copies.
            // https://stackoverflow.com/questions/7555442/move-an-element-to-another-parent-after-changing-its-id
            listNode.previousElementSibling.appendChild(listNode);
        }
    });

    for (const n of listElements) {
        const parentElement = n.parentElement;
        if (parentElement?.tagName === 'DIV' &&
            parentElement?.parentElement?.tagName === 'UL') {
            unwrapElement(parentElement);
        }
        // remove nested lists whose only child is another list, i.e. <ul><ul>...</ul></ul>
        if ((parentElement?.tagName === 'UL' || parentElement?.tagName === 'OL')
            && parentElement?.childNodes.length === 1) {
            unwrapElement(parentElement);
        }
    }

    // The contents of every EN list item are wrapped by a div element. `<li><div>foo</div></li>`
    // We need to remove this `<div>`, since it's a block element and will lead to unwanted whitespace otherwise
    const liElements: Array<HTMLElement> = Array.from(node.getElementsByTagName('li'));
    for (const liNode of liElements) {
        const listNodeDiv = liNode.firstElementChild;
        if (listNodeDiv && listNodeDiv.tagName === 'DIV') {
            const childElementsArr = Array.from(listNodeDiv.childNodes);
            listNodeDiv.replaceWith(...childElementsArr);
        }
    }

    return node;
};

// turndown 7.0.0 trims an inline element's edge whitespace with String.trim(), which also removes
// full-width spaces (U+3000, used to indent CJK text) and puts back at most one ASCII space. Move
// edge full-width spaces out of the element first, as plain text, which turndown leaves alone.
// Only those: a non-breaking space kept the same way can land at the start of a line and stop a
// table or image there from rendering (as turndown 7.2.4 does). Bold and italic edges are handled
// in their rules (bold-rule.ts).
const INLINE_MARKS = 'a, b, strong, i, em, u, s, strike, del, ins, span, font, mark, small, big, sub, sup, cite, q';
const FULL_WIDTH_SPACE = /　/;

const edgeText = (node: Node, first: boolean): Text | undefined => {
    let n: Node = node;
    while (n && n.nodeType === 1) {
        n = first ? n.firstChild : n.lastChild;
    }

    return n && n.nodeType === 3 ? n as Text : undefined;
};

const moveEdgeWhitespaceOutOfInlines = (node: HTMLElement) => {
    // innermost first, so whitespace moved out of a <b> can move on out of its <span>
    const marks = Array.from(node.querySelectorAll(INLINE_MARKS)).reverse();
    for (const mark of marks) {
        if (mark.closest('pre, code')) {
            continue;
        }
        // Only whitespace that shares its text node with text: a whitespace-only edge sits next to
        // a <br> or an image, and moving it out would leave the mark opening on a line break.
        const first = edgeText(mark, true);
        const leading = first?.data.match(/^\s+/);
        if (leading && leading[0].length < first.data.length && FULL_WIDTH_SPACE.test(leading[0])) {
            first.data = first.data.slice(leading[0].length);
            mark.before(leading[0]);
        }
        const last = edgeText(mark, false);
        const trailing = last?.data.match(/\s+$/);
        if (trailing && trailing[0].length < last.data.length && FULL_WIDTH_SPACE.test(trailing[0])) {
            last.data = last.data.slice(0, last.data.length - trailing[0].length);
            mark.after(trailing[0]);
        }
    }

    return node;
};

// The GFM table plugin has no rule for <caption>: its text landed on the delimiter row and broke
// the table, and as the table's first child it hid a <thead> row from the header check. Make it a
// paragraph above its table.
const moveCaptionsOutOfTables = (node: HTMLElement) => {
    for (const caption of Array.from(node.getElementsByTagName('caption'))) {
        const table = caption.closest('table');
        if (!table) {
            continue;
        }
        const paragraph = node.ownerDocument.createElement('p');
        paragraph.append(...Array.from(caption.childNodes));
        table.before(paragraph);
        caption.remove();
    }

    return node;
};

// The GFM table plugin counts a row's cells without their spans: a `rowspan` or `colspan` cell, or
// a short row, made the header and the delimiter row differ in width, and GFM then reads no table
// at all (a shop list's name, address and hours beside a photo spanning six rows). Make each table
// a full grid: every slot a span covers, and every slot missing at a row's end, gets an empty cell.
const span = (cell: HTMLElement, name: string, max: number): number => {
    const value = parseInt(cell.getAttribute(name) || '1', 10);

    return value === 0 ? max : Math.min(Math.max(value || 1, 1), max);
};
const squareTables = (node: HTMLElement) => {
    for (const table of Array.from(node.getElementsByTagName('table')) as Array<HTMLTableElement>) {
        // a layout table (one cell, or a table inside) is flattened: a one-cell table's colspan
        // made into cells would turn a page layout into a Markdown table (counted in cells: the
        // whitespace between tags, which isFlattenedTable's later caller no longer sees, is still here)
        if ((table.rows.length === 1 && table.rows[0].cells.length <= 1) || table.querySelector('table')) {
            continue;
        }
        const rows = Array.from(table.rows);
        const taken: Array<Set<number>> = rows.map(() => new Set());
        const emptyCell = (like: HTMLElement) => node.ownerDocument.createElement(like ? like.tagName : 'td');
        let width = 0;
        rows.forEach((row, r) => {
            let column = 0;
            for (const cell of Array.from(row.cells) as Array<HTMLElement>) {
                while (taken[r].has(column)) {
                    cell.before(emptyCell(cell));
                    column++;
                }
                const columns = span(cell, 'colspan', 1000);
                const rowsDown = span(cell, 'rowspan', rows.length - r);
                for (let c = 1; c < columns; c++) {
                    cell.after(emptyCell(cell));
                }
                for (let below = 1; below < rowsDown; below++) {
                    for (let c = 0; c < columns; c++) {
                        taken[r + below].add(column + c);
                    }
                }
                cell.removeAttribute('colspan');
                cell.removeAttribute('rowspan');
                column += columns;
            }
            while (taken[r].has(column)) {
                row.append(emptyCell(row.cells[row.cells.length - 1] as HTMLElement));
                column++;
            }
            width = Math.max(width, column);
        });
        for (const row of rows) {
            while (row.cells.length < width) {
                row.append(emptyCell(row.cells[row.cells.length - 1] as HTMLElement));
            }
        }
    }

    return node;
};

// Underline and strikethrough written in CSS (`<span style="text-decoration: underline">`,
// a struck-through <p> or <td>) were dropped: only <u>, <s> and <del> are converted. Wrap such an
// element's content in a real <u> or <s>. Not links, which are underlined anyway.
const DECORATED_ALREADY = new Set(['A', 'U', 'INS', 'S', 'DEL', 'STRIKE']);
const wrapCssDecorations = (node: HTMLElement) => {
    for (const element of Array.from(node.querySelectorAll('[style]')) as Array<HTMLElement>) {
        if (DECORATED_ALREADY.has(element.tagName) || !element.textContent.trim()) {
            continue;
        }
        const style = (element.getAttribute('style') || '').toLowerCase();
        const decoration = style.match(/(?<![\w-])text-decoration(?:-line)?\s*:\s*([^;]*)/);
        if (!decoration) {
            continue;
        }
        for (const [word, tag] of [['underline', 'u'], ['line-through', 's']]) {
            if (decoration[1].includes(word)) {
                const wrapper = node.ownerDocument.createElement(tag);
                wrapper.append(...Array.from(element.childNodes));
                element.append(wrapper);
            }
        }
    }

    return node;
};

// Every CSS property below is matched only where a declaration starts (`(?<![\w-])`): a web page's
// custom property such as `--paper-input-underline: …` or `--x-font-weight: 700` is not styling.
// Bold and italic written in CSS on anything but a <span> (`<div style="font-style:italic">` as an
// image caption, a bold <td>, <p> or <cite>) were dropped: only <b>/<i> and styled <span>s are
// converted. Wrap each run of inline content in a real <strong> or <em>, line by line, and let
// the styling reach child blocks. Not links or code, not a heading or <th> (bold already), and
// not content set back to normal weight or style.
const CSS_EMPHASIS: Array<[string, RegExp, RegExp, string]> = [
    ['strong', /(?<![\w-])font-weight\s*:\s*(bold|bolder|[6-9]00)\b/i, /(?<![\w-])font-weight\s*:\s*(normal|lighter|[1-5]00)\b/i, 'b, strong'],
    ['em', /(?<![\w-])font-style\s*:\s*(italic|oblique)\b/i, /(?<![\w-])font-style\s*:\s*normal\b/i, 'i, em'],
];
const BLOCK_ELEMENTS = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CENTER', 'DD', 'DIV', 'DL', 'DT',
    'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'NAV', 'OL', 'P',
    'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL', 'EN-NOTE']);
const EMPHASIS_SKIPPED = new Set(['A', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'PRE', 'CODE', 'BR']);
const wrapCssEmphasis = (node: HTMLElement) => {
    for (const [tag, on, off, sameMarks] of CSS_EMPHASIS) {
        const done = new Set<Node>();
        const skips = (element: HTMLElement): boolean => done.has(element)
            || off.test(element.getAttribute('style') || '')
            || element.tagName === 'PRE' || element.tagName === 'CODE'
            || (tag === 'strong' && /^(H[1-6]|TH)$/.test(element.tagName));
        const emphasizeRuns = (element: HTMLElement) => {
            done.add(element);
            let run: Array<Node> = [];
            const flush = () => {
                if (run.some(child => child.textContent.trim())) {
                    const wrapper = node.ownerDocument.createElement(tag);
                    run[0].parentNode.insertBefore(wrapper, run[0]);
                    wrapper.append(...run);
                    // the same mark inside would close the new one early: `**a **b** c**`
                    for (const inner of Array.from(wrapper.querySelectorAll(sameMarks))) {
                        inner.replaceWith(...Array.from(inner.childNodes));
                    }
                    for (const inner of Array.from(wrapper.querySelectorAll('span[style]'))) {
                        inner.setAttribute('style', inner.getAttribute('style').replace(new RegExp(on.source + '[^;]*;?', 'ig'), ''));
                    }
                }
                run = [];
            };
            for (const child of Array.from(element.childNodes) as Array<HTMLElement>) {
                if (child.nodeType !== 1) {
                    run.push(child);
                } else if (child.tagName === 'BR') {
                    flush();
                } else if (BLOCK_ELEMENTS.has(child.tagName) || child.querySelector(Array.from(BLOCK_ELEMENTS).join(','))) {
                    flush();
                    if (!skips(child)) {
                        emphasizeRuns(child);
                    }
                } else if (off.test(child.getAttribute('style') || '') || child.tagName === 'CODE') {
                    flush();
                } else {
                    run.push(child);
                }
            }
            flush();
        };
        for (const element of Array.from(node.querySelectorAll('[style]')) as Array<HTMLElement>) {
            if (EMPHASIS_SKIPPED.has(element.tagName) || !on.test(element.getAttribute('style') || '') || skips(element)
                || element.closest(`a, pre, code, ${sameMarks}`) || !element.textContent.trim()) {
                continue;
            }
            emphasizeRuns(element);
        }
    }

    return node;
};

// A <b> or <i> holding blocks (a web page's bold column of headings and paragraphs) wrote `**`
// around them all, and a mark cannot span blocks: `**### heading` and `text**` stayed literal.
// Make it a block carrying the same CSS, which wrapCssEmphasis marks run by run, line by line.
const BLOCK_SELECTOR = Array.from(BLOCK_ELEMENTS).filter(name => name !== 'EN-NOTE').join(',');
const blockMarksToCss = (node: HTMLElement) => {
    for (const [selector, css] of [['b, strong', 'font-weight: bold'], ['i, em', 'font-style: italic']]) {
        for (const mark of Array.from(node.querySelectorAll(selector)) as Array<HTMLElement>) {
            if (!mark.querySelector(BLOCK_SELECTOR) || mark.closest('a, pre, code')) {
                continue;
            }
            const block = node.ownerDocument.createElement('div');
            block.setAttribute('style', `${mark.getAttribute('style') || ''};${css}`);
            block.append(...Array.from(mark.childNodes));
            mark.replaceWith(block);
        }
    }

    return node;
};

// Monospace text right in the note or in a <div> beside blocks (`<en-note><font face="Andale
// Mono">#…</font><div>…</div>`) is never a <div> itself, so the code rule never saw it and the
// line stayed outside the fence. A browser lays such a run out as a block of its own: wrap it in a
// <div>, kept only where that <div> would be fenced, so no other text moves.
const wrapLooseMonospace = (node: HTMLElement, yarleOptions: YarleOptions) => {
    if (!yarleOptions.monospaceIsCodeBlock) {
        return node;
    }
    const containers = [node, ...Array.from(node.getElementsByTagName('div'))];
    for (const container of containers) {
        const children = Array.from(container.childNodes) as Array<HTMLElement>;
        if (container !== node && !children.some(child => child.nodeType === 1 && BLOCK_ELEMENTS.has(child.tagName))) {
            continue;
        }
        let run: Array<Node> = [];
        const flush = () => {
            if (run.some(child => child.textContent.trim())) {
                const block = node.ownerDocument.createElement('div');
                run[0].parentNode.insertBefore(block, run[0]);
                block.append(...run);
                if (!fencesItself(block)) {
                    block.replaceWith(...Array.from(block.childNodes));
                }
            }
            run = [];
        };
        for (const child of children) {
            if (child.nodeType === 1 && BLOCK_ELEMENTS.has(child.tagName)) {
                flush();
            } else if (child.nodeType === 1 || child.nodeType === 3) {
                run.push(child);
            }
        }
        flush();
    }

    return node;
};

// turndown collapses runs of spaces outside <pre>, which broke the alignment of logs, configs
// and tables typed in a monospace font. In a block fenced as code they become no-break spaces,
// which turndown keeps; replaceMonospaceCodeBlock turns them back into spaces.
const keepCodeBlockSpaces = (node: HTMLElement, yarleOptions: YarleOptions) => {
    if (!yarleOptions.monospaceIsCodeBlock) {
        return node;
    }
    node.querySelectorAll('div').forEach(div => {
        if (!fencesItself(div)) {
            return;
        }
        const walker = div.ownerDocument.createTreeWalker(div, 4 /* NodeFilter.SHOW_TEXT */);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            // a newline marks the source's own indentation between tags, not typed spaces
            if (!text.nodeValue.includes('\n')) {
                text.nodeValue = text.nodeValue.replace(/ /g, '\u00a0');
            }
        }
    });

    return node;
};

const SELF_CLOSED_ELEMENT = /<([a-zA-Z][\w-]*)(\s[^<>]*?)?\s*\/>/g;
// void elements, and Evernote's own (en-media and en-todo are handled as they are)
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
    'param', 'source', 'track', 'wbr', 'en-media', 'en-todo', 'en-crypt', 'en-note']);

export const convertHtml2MdContent = (yarleOptions: YarleOptions, htmlContent: string): string => {

    // Close every self-closing <a …/>: an HTML parser reads it as an opening tag, so a link left
    // open swallows the rest of the note as its link text (this replaced only the first one).
    // Likewise every other element that is not void: an open <u/>, <i/> or <b/> underlined,
    // italicised or bolded the rest of the note, an open <span/> carried its style on, and an
    // open <li/> or <td/> nested what followed inside it (654 notes, 18k <span/>).
    const content = htmlContent.replace(/<!DOCTYPE en-note [^>]*>/, '<!DOCTYPE html>')
      .replace(/(<a [^>]*)\/>/g, '$1></a>').replace(/<div[^\/\<]*\/>/g, '')
      .replace(SELF_CLOSED_ELEMENT, (tag, name, attributes) =>
        VOID_ELEMENTS.has(name.toLowerCase()) ? tag : `<${name}${attributes || ''}></${name}>`);

    const contentNode = new JSDOM(fixSublistsInContent(content)).window.document
      .getElementsByTagName('en-note').item(0) as any as HTMLElement;

    let contentInMd = getTurndownService(yarleOptions)
        .turndown(fixTasks(wrapCssDecorations(moveEdgeWhitespaceOutOfInlines(wrapCssEmphasis(blockMarksToCss(squareTables(moveCaptionsOutOfTables(keepCodeBlockSpaces(wrapLooseMonospace(fixSublists(contentNode), yarleOptions), yarleOptions)))))))));

    const newLinePlaceholder = new RegExp('<YARLE_NEWLINE_PLACEHOLDER>', 'g');
    contentInMd = contentInMd.replace(newLinePlaceholder, yarleOptions.convertPlainHtmlNewlines ? '\n': '');

    if (yarleOptions.outputFormat === OutputFormat.LogSeqMD) {

      contentInMd = contentInMd.replace(/\n/g, '\n- ') // add a "- " at each new line
      // .replace(/\r/g, '\n')
      .replace(/<br>/g, '[:br]')// fix new line in table
      .replace(/- \|/g, ' |')// fix table problem
      .replace(/- __\n/g, '- \n')// fix empty bold/italic
      .replace(/- \*\*\*\*\n/g, '- \n')
      .replace(/- _\*\*\*\*_\n/g, '- \n')
      .replace(/- \*\*__\*\*\n/g, '- \n');

      contentInMd = `- ${contentInMd}`; // the first line

    }

    return contentInMd && contentInMd !== 'undefined' ? performRegexpOnContent(yarleOptions, contentInMd): '';
};
