
import { yarleOptions } from '../../yarle';
import { isInMonospaceCodeBlock } from './replace-monospace-code-block';
import { OutputFormat } from '../../output-format';

import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { getLanguageItems } from './../../outputLanguages/LanguageFactory';
import { emphasize } from './bold-rule';

const EVERNOTE_HIGHLIGHT = '-evernote-highlight:true;';
const EVERNOTE_COLORHIGHLIGHT = '--en-highlight';

const parseColour = (value: string): Array<number> | undefined => {
    const hex = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];

        return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    }
    const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?/i);
    if (rgb && !(rgb[4] !== undefined && Number(rgb[4]) < 0.2)) {
        return [1, 2, 3].map(i => Number(rgb[i]));
    }

    return undefined;
};

// convertColorsToMDHighlight marked any span with a colour, so a web page's own near-black body
// text, grey captions and Evernote's font-family marker all became ==highlight==, and the stray
// `==` stopped bold from closing. Mark only a real colour: chromatic text, or a non-white background.
const hasRealColour = (style: string): boolean => {
    const text = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    const textColour = text && parseColour(text[1]);
    if (textColour && Math.max(...textColour) - Math.min(...textColour) >= 64) {
        return true;
    }
    const background = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    const backgroundColour = background && parseColour(background[1]);
    if (backgroundColour) {
        const [r, g, b] = backgroundColour;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        return luma < 240 || Math.max(r, g, b) - Math.min(r, g, b) >= 24;
    }

    return false;
};

export const spanRule = {
    filter: filterByNodeName('SPAN'),
    replacement: (content: any, node: any) => {

        //const HIGHLIGHT_SEPARATOR = yarleOptions.outputFormat === OutputFormat.ObsidianMD ? '==' : '`' ;
        const nodeProxy = getAttributeProxy(node);
        // a code block shows `==` as typed
        if (isInMonospaceCodeBlock(node)) {
            return content;
        }
        if (nodeProxy.style && content.trim() !== '') {
            const nodeValue: string = nodeProxy.style.value;
            const languageItems = getLanguageItems(yarleOptions.outputFormat)

            // this aims to care for bold text generated as <span style="font-weight: bold;">Bold</span>
            if (content !== '<YARLE_NEWLINE_PLACEHOLDER>') {
                // `font-weight: 700` is bold too; a font named "…Bold" or "…Italic" is not
                const hasBold = /font-weight\s*:\s*(bold|bolder|[6-9]00)\b/i.test(nodeValue);
                const hasItalic = /font-style\s*:\s*(italic|oblique)\b/i.test(nodeValue);
                if (hasBold && !hasItalic) { return emphasize(content, node, languageItems.bold, 'strong'); }
                if (!hasBold && hasItalic) { return emphasize(content, node, languageItems.italic, 'em'); }
                if (hasBold && hasItalic) {
                    return emphasize(emphasize(content, node, languageItems.bold, 'strong'), node, languageItems.italic, 'em');
                }
            }

            // a coloured span inside a highlighted one is already marked: `====text====` renders as stray `==`
            const alreadyHighlighted = content.startsWith(languageItems.highlight) && content.endsWith(languageItems.highlight);

            return !alreadyHighlighted && (nodeValue.includes(EVERNOTE_HIGHLIGHT) ||
                nodeValue.includes(EVERNOTE_COLORHIGHLIGHT) ||
                (yarleOptions.convertColorsToMDHighlight && hasRealColour(nodeValue)))?
                `${languageItems.highlight}${content}${languageItems.highlight}` :
                content;
        }

        return content;
    },
};
