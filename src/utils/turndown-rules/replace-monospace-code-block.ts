import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { unescapeMarkdown } from './replace-code-block';
import { yarleOptions } from './../../yarle';
import { isFlattenedTable } from './flattened-table';

const markdownBlock = '\n```\n';

const codeBlockFlag = '-en-codeblock:true';
const reMonospaceFont =
    /\b(Courier|Mono|Consolas|Console|Inconsolata|Pitch|Monaco|monospace)\b/;

const ownFont = (node: any): string => {
    const nodeProxy = getAttributeProxy(node);
    if (node.tagName === 'FONT' && nodeProxy.face?.value) {
        return nodeProxy.face.value;
    }
    const match = nodeProxy.style?.value?.match(/(?<![\w-])font-family\s*:([^;]+)/);

    return match ? match[1] : null;
};

// Content a code block cannot show: a block holding one is not fenced, whatever its font.
const NOT_CODE = new Set(['IMG', 'EN-MEDIA', 'EN-TODO', 'INPUT', 'HR', 'TABLE', 'UL', 'OL',
    'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

// A monospace font all of the node's text is set in: the nearest font above each non-blank text
// node (and each <br>, so a blank line keeps its font), or 'mixed'. It used to follow only a chain of
// single children, so a monospace line holding a link (text, <a>, text) read as 'mixed'.
const deepestFont: (node: any) => string = node => {
    if (node.nodeType !== 1) {
        return null;
    }
    const fonts = new Set<string>();
    const walk = (n: any, inherited: string) => {
        if (n.nodeType === 3) {
            if (n.nodeValue.trim()) {
                fonts.add(inherited);
            }

            return;
        }
        if (n.nodeType !== 1) {
            return;
        }
        const font = ownFont(n) || inherited;
        if (n.tagName === 'BR') {
            fonts.add(font);
        }
        if (NOT_CODE.has(n.tagName)) {
            fonts.add(null);

            return;
        }
        n.childNodes.forEach((child: any) => walk(child, font));
    };
    walk(node, null);
    if (fonts.size === 0) {
        return ownFont(node);
    }

    // the same font is written several ways ('Andale Mono', Andale Mono, Monaco, monospace)
    const monospace = [...fonts].map(font => !!font && reMonospaceFont.test(font));

    return monospace.every(Boolean) ? [...fonts][0] : 'mixed';
};

const isMonospaceCodeBlock: (node: any) => boolean = node => {
    const nodeProxy = getAttributeProxy(node);
    const style = nodeProxy.style?.value;
    if (style && style.includes(codeBlockFlag)) {
        return true;
    }

    const font = deepestFont(node);

    return font && reMonospaceFont.test(font);
};
/*
export const monospaceCodeBlockRule = {
    filter: filterByNodeName('DIV'),
    replacement: (content: string, node: any) => {
        if (yarleOptions.monospaceIsCodeBlock && isMonospaceCodeBlock(node)) {
            return replaceMonospaceCodeBlock(content, node);
        }
    },
};
*/
// A code block inside another one (a monospace line in an Evernote code block, or a monospace
// <div> around a <pre>, which fences itself) opened a second fence: the inner ``` closed the
// outer block, leaving an empty block and the code unfenced. Only the outermost one fences.
const isInsideCodeBlock = (node: any): boolean => {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'PRE' || (parent.tagName === 'DIV' && fencesItself(parent))) {
            return true;
        }
    }

    return false;
};

// A node inside a code block this rule fences (for links shown as their text there).
export const isInMonospaceCodeBlock = (node: any): boolean =>
    yarleOptions.monospaceIsCodeBlock && isInsideCodeBlock(node);

// A <pre> or <code> inside renders as code itself (a fence, or backticks), so the block around it
// is not fenced again. A cell of a Markdown table cannot hold a fence: it would break the table
// (a layout table is flattened, so code in it, such as a GitHub comment, is fenced).
const inTableCell = (node: any): boolean => {
    const cell = node.closest('td, th');

    return !!cell && !isFlattenedTable(cell.closest('table'));
};

export const fencesItself = (node: any): boolean =>
    isMonospaceCodeBlock(node) && !isInsideCodeBlock(node) && !node.querySelector('pre, code')
    && !inTableCell(node);

// The element next to a node, past the whitespace the source puts between tags (a newline
// between two <div>s split one block of monospace lines into a fence per line).
const siblingBlock = (node: any, next: boolean): any => {
    let sibling = next ? node.nextSibling : node.previousSibling;
    while (sibling && sibling.nodeType === 3 && !sibling.nodeValue.trim()) {
        sibling = next ? sibling.nextSibling : sibling.previousSibling;
    }

    return sibling;
};

const fencedSibling = (node: any, next: boolean): any => {
    const sibling = siblingBlock(node, next);

    return sibling && sibling.tagName === node.tagName && fencesItself(sibling) ? sibling : undefined;
};

const hasCodeAlong = (node: any, next: boolean): boolean => {
    for (let sibling = fencedSibling(node, next); sibling; sibling = fencedSibling(sibling, next)) {
        if (sibling.textContent.trim()) {
            return true;
        }
    }

    return false;
};

// A blank monospace line is code only between code lines; blank lines alone, or at the edge of a
// block, opened empty fences.
const fences = (node: any): boolean => fencesItself(node)
    && (!!node.textContent.trim() || (hasCodeAlong(node, false) && hasCodeAlong(node, true)));

export const replaceMonospaceCodeBlock = (content: string, node: any): any => {
    if (fences(node)) {
        const previous = siblingBlock(node, false);
        const previousIsBlock = previous && previous.tagName === node.tagName && fences(previous);
        const next = siblingBlock(node, true);
        const nextIsBlock = next && next.tagName === node.tagName && fences(next);
        // turndown escaped the markdown characters (and every '\\'); a code block shows them
        // as typed. The merged lines kept the escapes until 2026-11-02. Spaces arrive as
        // no-break spaces (keepCodeBlockSpaces in convert-html-to-md.ts) and go back to spaces.
        content = unescapeMarkdown(content).replace(/\u00a0/g, ' ');
        if (previousIsBlock || nextIsBlock) {
            content = previousIsBlock ? `\n${content}` : `${markdownBlock}${content}`;
            content = nextIsBlock ? `${content}\n` : `${content}${markdownBlock}`;

            return content;
        }

        return content.trim() ? `${markdownBlock}${content}${markdownBlock}` : content;
    }

    if (node.parentElement && isMonospaceCodeBlock(node.parentElement) && node.parentElement.firstElementChild === node) {
        return content;
    }

    if (node.parentElement && isMonospaceCodeBlock(node.parentElement)) {
        return `\n${content}`;
    }

    return node.isBlock ? `\n${content}\n` : content;
};
