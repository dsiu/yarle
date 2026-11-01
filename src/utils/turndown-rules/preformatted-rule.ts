// turndown's code block reads only a <pre>'s first child (`<pre><code>$ </code><strong><code>port
// install</code></strong></pre>` kept just `$ `), and a <pre> without a <code> inside was plain
// text with its line breaks gone. Write every <pre> as a fenced block of its whole text.
export const preformattedRule = {
  filter: (node: any) => node.nodeName === 'PRE' && node.parentNode?.nodeName !== 'PRE',
  replacement: (content: any, node: any) => {
    const copy = node.cloneNode(true);
    for (const br of Array.from(copy.getElementsByTagName('br')) as Array<any>) {
      br.replaceWith('\n');
    }
    // HTML drops a newline right after <pre>; trailing blank lines carry nothing
    const code = copy.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    if (!code) {
      return '';
    }
    const longestRun = Math.max(2, ...(code.match(/`+/g) || []).map((run: string) => run.length));
    const fence = '`'.repeat(longestRun + 1);

    return `\n\n${fence}\n${code}\n${fence}\n\n`;
  },
};
