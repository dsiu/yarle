import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { yarleOptions } from '../../yarle';
import { emphasize } from './bold-rule';

// Note: this rule must appear *after* use(gfm) so it can override
// turndown-plugin-gfm rule for strikethrough (which always uses single '~')
export const italicRule = {
  filter: ['i', 'em'],
  replacement: (content: any, node: any) => {
    const languageItems = getLanguageItems(yarleOptions.outputFormat)
    return emphasize(content, node, languageItems.italic, 'em')
  },
};
