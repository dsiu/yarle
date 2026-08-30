import { StandardMD } from "./StandardMD";
import { Language } from "./language";

/**
 * Standard Markdown links (`![alt](path)`) with `==highlight==` kept.
 *
 * StandardMD degrades a highlight to backtick-code, which reads as *code* rather
 * than as emphasis. `==` is understood by Obsidian, QLMarkdown, DEVONthink and
 * Peekdown, so it survives outside Evernote far better than the alternative.
 *
 * Everything else — links, images, bold, italic, strikethrough, lists, tasks —
 * is inherited from StandardMD unchanged.
 */
export class PortableMD extends StandardMD implements Language {
    constructor(){
        super()
    }

    languageItems =  {
        bold: '**',
        italic: '_',
        highlight: '==',
        strikethrough: '~~',
        listItem: '* '
    };

}
