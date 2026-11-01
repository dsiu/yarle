import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { yarleOptions } from '../../yarle';

// turndown trims a mark's content only when the mark is not already next to whitespace, so in
// `中文 <b>&nbsp; 1 2</b>` the non-breaking space stayed inside: `**  1 2**`, which no Markdown
// reader renders as bold. emphasize() keeps edge whitespace (line breaks included) outside.
const BLOCKS = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'TR', 'TABLE', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'BR', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'EN-NOTE', 'BODY']);
// Private-use characters (icon-font glyphs such as FontAwesome's) too: pandoc treats them as
// punctuation, so `**\uf112**Reply` stayed literal asterisks there.
const PUNCTUATION = /[\p{P}\p{S}\p{Co}]/u;
const isSpaceOrPunctuation = (char: string): boolean => /\s/.test(char) || PUNCTUATION.test(char);

// A table the GFM plugin does not convert (one cell, or a table inside: a layout table) is written
// cell after cell with nothing between, so its cell boundaries are not whitespace. Same test as
// the plugin's tableShouldBeSkipped.
const TABLE_PARTS = new Set(['TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'TD', 'TH']);
const isFlattenedTable = (table: any): boolean => !table || !table.rows
  || (table.rows.length === 1 && table.rows[0].childNodes.length <= 1) || !!table.querySelector('table');
const isBoundary = (node: any): boolean => BLOCKS.has(node.nodeName)
  && !(TABLE_PARTS.has(node.nodeName) && isFlattenedTable(node.nodeName === 'TABLE' ? node : node.closest('table')));

// The node whose text comes right next to a node in the rendered text; none at a block boundary.
const adjacentNode = (node: any, before: boolean): any => {
  for (let n = node; n && !isBoundary(n); n = n.parentNode) {
    for (let sibling = before ? n.previousSibling : n.nextSibling; sibling;
         sibling = before ? sibling.previousSibling : sibling.nextSibling) {
      if (sibling.nodeType === 1 && isBoundary(sibling)) {
        return undefined;
      }
      if (sibling.textContent) {
        return sibling;
      }
    }
  }

  return undefined;
};

// The character next to a node in the rendered text; a block boundary counts as whitespace.
const adjacentChar = (node: any, before: boolean): string => {
  const text = adjacentNode(node, before)?.textContent;

  return text ? (before ? text[text.length - 1] : text[0]) : ' ';
};

const SAME_MARK: { [tag: string]: Set<string> } = {
  strong: new Set(['B', 'STRONG']), em: new Set(['I', 'EM']), del: new Set(['S', 'DEL', 'STRIKE']),
};
const SAME_MARK_STYLE: { [tag: string]: RegExp } = {
  strong: /font-weight\s*:\s*(bold|bolder|[6-9]00)\b/i, em: /font-style\s*:\s*(italic|oblique)\b/i, del: /line-through/i,
};
// a styled <span> (OneNote, web clips) is the same mark as the element
const isSameMark = (element: any, tag: string): boolean => !!element && (SAME_MARK[tag]?.has(element.nodeName)
  || (element.nodeName === 'SPAN' && SAME_MARK_STYLE[tag]?.test(element.getAttribute('style') || '')));

// The element right before a node with no text between them (whitespace counts as text). An empty
// element in between (`<b>a</b><span></span><b>b</b>`) writes nothing, so it does not separate.
const previousElementWithoutText = (node: any): any => {
  let sibling = node.previousSibling;
  while (sibling && sibling.textContent === '' && !(sibling.nodeType === 1 && (BLOCKS.has(sibling.nodeName)
    || /^(IMG|EN-MEDIA|EN-TODO|INPUT)$/.test(sibling.nodeName) || sibling.querySelector('img, en-media, en-todo, br')))) {
    sibling = sibling.previousSibling;
  }

  return sibling && sibling.nodeType === 1 ? sibling : undefined;
};

// Whether the text before a node ends inside the same mark, across elements: the last cell of a
// flattened layout table, `<td><b>完成。</b></td><td><b>地點:</b></td>`, made `完成。****地點:`.
const lastChildWithText = (node: any): any => {
  let child = node.lastChild;
  while (child && !child.textContent) {
    child = child.previousSibling;
  }

  return child;
};
const endsInSameMark = (node: any, tag: string): boolean => {
  for (let n = node; n && n.nodeType === 1; n = lastChildWithText(n)) {
    if (isSameMark(n, tag)) {
      return true;
    }
  }

  return false;
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
  // `**a**` right after another `**b**` makes `**b****a**`: the delimiters touch and do not parse
  const touchesSameMark = !leading
    && (isSameMark(previousElementWithoutText(node), tag) || endsInSameMark(adjacentNode(node, true), tag));
  const cannotOpen = touchesSameMark || (PUNCTUATION.test(first) && !isSpaceOrPunctuation(before));
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
