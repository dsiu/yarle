/**
 * Renders a link/image destination for standard-Markdown output.
 *
 * CommonMark ends a link destination at the first unescaped space, so a path
 * such as `./_resources/Screen Shot 2020-11-05.png` silently stops being a
 * link. Wrapping the destination in angle brackets (CommonMark 6.6) fixes it
 * without touching the file on disk: cmark-gfm percent-encodes the URL itself
 * at render time, so the Markdown source keeps the literal, greppable filename.
 *
 * Only paths that actually need it are wrapped, so the common case stays plain.
 * Non-ASCII characters are handled by the parser and are deliberately left
 * alone, as are *balanced* parentheses.
 *
 * Unbalanced parentheses must be wrapped, though: a bare destination may only
 * contain parentheses in matched pairs. These arise routinely here, because
 * `folder-utils.ts` truncates the `.resources` directory stem to 50 chars and
 * can cut a closing paren off — `The_Technical_Interview_Is_Dead_(And_No_One_Should.resources`
 * — and because some note titles are natively unbalanced (`美國真正的可怕的地方在哪兒？(`).
 */
const hasUnbalancedParens = (target: string): boolean => {
  let depth = 0;
  for (const char of target) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) {
        return true;
      }
    }
  }

  return depth !== 0;
};

export const mdLinkTarget = (target: string): string => {
  return /[ <>]/.test(target) || hasUnbalancedParens(target)
    ? `<${target.replace(/([<>])/g, '\\$1')}>`
    : target;
};
