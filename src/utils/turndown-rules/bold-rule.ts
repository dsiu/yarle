import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { yarleOptions } from '../../yarle';

// turndown trims a mark's content only when the mark is not already next to whitespace, so in
// `中文 <b>&nbsp; 1 2</b>` the non-breaking space stayed inside: `**  1 2**`, which no Markdown
// reader renders as bold. Keep any edge whitespace (line breaks included) outside the delimiters.
export const wrapKeepingEdgeWhitespace = (content: string, delimiter: string): string => {
  const [, leading, inner, trailing] = content.match(/^(\s*)([\s\S]*?)(\s*)$/);

  return inner ? `${leading}${delimiter}${inner}${delimiter}${trailing}` : content;
};

export const boldRule = {
  filter: ['strong', 'b'],
  replacement: (content: any) =>
    wrapKeepingEdgeWhitespace(content, getLanguageItems(yarleOptions.outputFormat).bold),
};
