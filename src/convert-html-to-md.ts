import { JSDOM } from 'jsdom';

import { getTurndownService } from './utils/turndown-service';
import { NoteData } from './models/NoteData';
import { YarleOptions } from './YarleOptions';
import { OutputFormat } from './output-format';
import { performRegexpOnContent } from './utils/get-title';

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
const fixSublistsInContent = (content: string): string => {
    let cont = content.replace(/<li>/g, '<li><div>');
    cont = cont.replace(/<\/li>/g, '</div></li>');
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
        const decoration = style.match(/text-decoration(?:-line)?\s*:\s*([^;]*)/);
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

export const convertHtml2MdContent = (yarleOptions: YarleOptions, htmlContent: string): string => {

    // Close every self-closing <a …/>: an HTML parser reads it as an opening tag, so a link left
    // open swallows the rest of the note as its link text (this replaced only the first one).
    const content = htmlContent.replace(/<!DOCTYPE en-note [^>]*>/, '<!DOCTYPE html>')
      .replace(/(<a [^>]*)\/>/g, '$1></a>').replace(/<div[^\/\<]*\/>/g, '');

    const contentNode = new JSDOM(fixSublistsInContent(content)).window.document
      .getElementsByTagName('en-note').item(0) as any as HTMLElement;

    let contentInMd = getTurndownService(yarleOptions)
        .turndown(fixTasks(wrapCssDecorations(moveEdgeWhitespaceOutOfInlines(moveCaptionsOutOfTables(fixSublists(contentNode))))));

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
