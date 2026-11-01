import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { yarleOptions } from '../../yarle';

// turndown trims a mark's content only when the mark is not already next to whitespace, so in
// `中文 <b>&nbsp; 1 2</b>` the non-breaking space stayed inside: `**  1 2**`, which no Markdown
// reader renders as bold. emphasize() keeps edge whitespace (line breaks included) outside.
const BLOCKS = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'TR', 'TABLE', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'BR', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'EN-NOTE', 'BODY']);
const PUNCTUATION = /[\p{P}\p{S}]/u;
const isSpaceOrPunctuation = (char: string): boolean => /\s/.test(char) || PUNCTUATION.test(char);

// The character next to a node in the rendered text; a block boundary counts as whitespace.
const adjacentChar = (node: any, before: boolean): string => {
  for (let n = node; n && !BLOCKS.has(n.nodeName); n = n.parentNode) {
    for (let sibling = before ? n.previousSibling : n.nextSibling; sibling;
         sibling = before ? sibling.previousSibling : sibling.nextSibling) {
      if (sibling.nodeType === 1 && BLOCKS.has(sibling.nodeName)) {
        return ' ';
      }
      const text = sibling.textContent || '';
      if (text) {
        return before ? text[text.length - 1] : text[0];
      }
    }
  }

  return ' ';
};

// CommonMark opens `**` only if it is not followed by punctuation, or is preceded by whitespace or
// punctuation; closing mirrors that. So `**…changed?**The` and `是**「書」**字` stay literal
// asterisks. `_` also never opens or closes inside a word, and CJK text has no spaces between
// words. Where the delimiter cannot work, write the HTML element, which every reader renders.
export const emphasize = (content: string, node: any, delimiter: string, tag: string): string => {
  const [, leading, inner, trailing] = content.match(/^(\s*)([\s\S]*?)(\s*)$/);
  // a heading is bold already; `# **Title**` only adds asterisks
  if (!inner || (tag === 'strong' && node.closest && node.closest('h1, h2, h3, h4, h5, h6'))) {
    return content;
  }
  const before = leading ? ' ' : adjacentChar(node, true);
  const after = trailing ? ' ' : adjacentChar(node, false);
  const first = inner[0];
  const last = inner[inner.length - 1];
  const cannotOpen = PUNCTUATION.test(first) && !isSpaceOrPunctuation(before);
  const cannotClose = PUNCTUATION.test(last) && !isSpaceOrPunctuation(after);
  const intraword = delimiter.startsWith('_') && (!isSpaceOrPunctuation(before) || !isSpaceOrPunctuation(after));

  return (cannotOpen || cannotClose || intraword)
    ? `${leading}<${tag}>${inner}</${tag}>${trailing}`
    : `${leading}${delimiter}${inner}${delimiter}${trailing}`;
};

export const boldRule = {
  filter: ['strong', 'b'],
  replacement: (content: any, node: any) =>
    emphasize(content, node, getLanguageItems(yarleOptions.outputFormat).bold, 'strong'),
};
