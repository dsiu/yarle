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
 * Balanced parentheses and non-ASCII characters are handled by the parser and
 * are deliberately left alone.
 */
export const mdLinkTarget = (target: string): string => {
  return /[ <>]/.test(target) ? `<${target.replace(/([<>])/g, '\\$1')}>` : target;
};
