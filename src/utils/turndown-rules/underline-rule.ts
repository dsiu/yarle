import { isInMonospaceCodeBlock } from './replace-monospace-code-block';

// Note: this rule must appear *after* use(gfm) so it can override
// turndown-plugin-gfm rule for strikethrough (which always uses single '~')
export const underlineRule = {
  filter: ['u', 'ins'],
  replacement: (content: any, node: any) => {
   // a code block shows tags as typed
   return isInMonospaceCodeBlock(node) ? content : `<u>${content}</u>`
  },
};
