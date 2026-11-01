import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { unescapeMarkdown } from './replace-code-block';

const markdownBlock = '\n```\n';

const codeBlockFlag = '-en-codeblock:true';
const reMonospaceFont =
    /\b(Courier|Mono|Consolas|Console|Inconsolata|Pitch|Monaco|monospace)\b/;

const deepestFont: (node: any) => string = node => {
    if (node.nodeType !== 1) {
        return null;
    }
    const children = node.childNodes;
    const numChildren = children.length;
    if (numChildren > 1) {
        return 'mixed';
    }
    if (numChildren === 1) {
        const font = deepestFont(children[0]);
        if (font) {
            return font;
        }
    }
    const nodeProxy = getAttributeProxy(node);
    if (node.tagName === 'FONT') {
        return nodeProxy.face?.value;
    }
    const style = nodeProxy.style?.value;
    if (style) {
        const match = style.match(/font-family:([^;]+)/);
        if (match) {
            return match[1];
        }
    }

    return null;
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
        if (parent.tagName === 'PRE' || (parent.tagName === 'DIV' && isMonospaceCodeBlock(parent))) {
            return true;
        }
    }

    return false;
};

const fencesItself = (node: any): boolean =>
    isMonospaceCodeBlock(node) && !isInsideCodeBlock(node) && node.getElementsByTagName('pre').length === 0;

export const replaceMonospaceCodeBlock = (content: string, node: any): any => {
    if (fencesItself(node)) {
        const previous = node.previousSibling;
        const previousIsBlock = previous && previous.tagName === node.tagName && fencesItself(previous);
        const next = node.nextSibling;
        const nextIsBlock = next && next.tagName === node.tagName && fencesItself(next);
        if (previousIsBlock || nextIsBlock) {
            content = previousIsBlock ? `\n${content}` : `${markdownBlock}${content}`;
            content = nextIsBlock ? `${content}\n` : `${content}${markdownBlock}`;

            return content;
        }

        content = unescapeMarkdown(content);

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
