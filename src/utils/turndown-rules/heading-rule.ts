// An ATX heading is one line, but a heading can hold line breaks and blocks: a web page's section
// title after a <br> (`<h3><br/><strong>Title</strong></h3>`), a title wrapped as `Get our<br>top
// stories`, a forum's poster card of <div>s. turndown wrote `### ` with the text on the lines
// after it, so the title read as plain text under an empty heading. Keep it one heading and write
// its line breaks as <br>, as in a table cell; drop blank lines, and a heading with no text at
// all. A table inside a heading (a page's like button) cannot be part of the line, so its rows
// stay a table between the heading's lines.
const isTableRow = (line: string): boolean => line.startsWith('|');

export const headingRule = {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content: string, node: any, options: any) => {
    const level = Number(node.nodeName.charAt(1));
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    if (!lines.length) {
      return '\n\n';
    }
    if (lines.length === 1 && options.headingStyle === 'setext' && level < 3) {
      return `\n\n${lines[0]}\n${(level === 1 ? '=' : '-').repeat(lines[0].length)}\n\n`;
    }
    const blocks: Array<string> = [];
    for (let i = 0; i < lines.length; i++) {
      const run = [lines[i]];
      while (i + 1 < lines.length && isTableRow(lines[i + 1]) === isTableRow(lines[i])) {
        run.push(lines[++i]);
      }
      blocks.push(isTableRow(run[0]) ? run.join('\n') : `${'#'.repeat(level)} ${run.join('<br>')}`);
    }

    return `\n\n${blocks.join('\n\n')}\n\n`;
  },
};
