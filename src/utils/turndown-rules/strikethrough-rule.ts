import { yarleOptions } from '../../yarle';
import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { emphasize } from './bold-rule';

// Note: this rule must appear *after* use(gfm) so it can override
// turndown-plugin-gfm rule for strikethrough (which always uses single '~')
export const strikethroughRule = {
  filter: ['del', 's', 'strike'],
  replacement: (content: any, node: any) => {
    const languageItems = getLanguageItems(yarleOptions.outputFormat);

    return emphasize(content, node, languageItems.strikethrough, 'del');
  },
};
