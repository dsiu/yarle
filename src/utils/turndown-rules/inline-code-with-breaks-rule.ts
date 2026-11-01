// An inline <code> holding <br>s (pasted forum code, "Code: Select all") became a code span
// across several lines, so each line starting with `#` rendered as a heading. Write it as a
// fenced block instead, one line per <br>. Single-line inline code is left to turndown.
const isInsidePre = (node: any): boolean => {
  for (let n = node.parentNode; n; n = n.parentNode) {
    if (n.nodeName === 'PRE') { return true; }
  }

  return false;
};

export const inlineCodeWithBreaksRule = {
  filter: (node: any) =>
    node.nodeName === 'CODE' && !isInsidePre(node) && node.getElementsByTagName('br').length > 0,
  replacement: (content: any, node: any) => {
    const copy = node.cloneNode(true);
    for (const br of Array.from(copy.getElementsByTagName('br')) as Array<any>) {
      br.replaceWith('\n');
    }
    const code = copy.textContent.replace(/^\n+|\n+$/g, '');
    const fence = code.includes('```') ? '~~~' : '```';

    return `\n\n${fence}\n${code}\n${fence}\n\n`;
  },
};
