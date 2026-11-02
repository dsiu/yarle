import marked, { Token } from 'marked';
import * as _ from 'lodash';

import { getUniqueId, normalizeFilenameString } from '../filename-utils';
import { OutputFormat } from '../../output-format';
import { yarleOptions } from '../../yarle';
import { getTurndownService } from '../turndown-service';
import { RuntimePropertiesSingleton } from '../../runtime-properties';

import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { isTOC } from './../../utils/is-toc';
import { isHeptaOrObsidianOutput } from './../../utils/is-hepta-or-obsidian-output';
import { mdLinkTarget } from './../md-link-target';
import { isStandardMdFamily } from './../is-standard-md-family';
import { isInMonospaceCodeBlock } from './replace-monospace-code-block';
import sanitize from 'sanitize-filename';

export const removeBrackets = (str: string): string => {
    return str.replace(/\[|\]/g, '');
};
export const removeDoubleBackSlashes = (str: string): string => {
    return str.replace(/\\/g, '');
};
const isEvernoteLink = (value: string): boolean => {
    let url;
    try {
        url = new URL(value);
    } catch(e){
        return false;
    }
    // NOTE: URL automatically converts to lowercase
    if (url.protocol === 'evernote:') {
        // Internal link format: evernote:///view/92167309/s714/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/
        const pathSpl = url.pathname.split('/').filter(Boolean); // Split and removes empty strings
        if (pathSpl[0] !== 'view' || pathSpl.length < 4) return false;
        return true;
    } else if ((url.protocol === 'http:' || url.protocol === 'https:') && url.host === 'www.evernote.com') {
        // External link format: https://www.evernote.com/shard/s714/nl/92167309/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/
        const pathSpl = url.pathname.split('/').filter(Boolean); // Removes empty strings
        if (pathSpl[0] !== 'shard' || pathSpl.length < 5) return false;
        return true;
    }
    return false;
}
const getEvernoteUniqueId = (value: string): string => {
    if (yarleOptions.keepEvernoteLinkIfNoNoteFound)
        return value;
    const urlSpl = value.split('/').reverse()
    return ((urlSpl[0] !== '')
        ? [urlSpl[0],urlSpl[1]]
        : [urlSpl[1],urlSpl[2]]).join('/')
}
// In a code block a link shows as typed. When its text is its own address (an autolinked host or
// URL in a pasted log), the text alone loses nothing; any other link keeps its markdown.
const sameAddress = (text: string, href: string): boolean => {
    const bare = (s: string) => s.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/$/, '').toLowerCase();

    return bare(text) === bare(href);
};

const linkReplacement = (content: any, node: any): string => {
        const nodeProxy = getAttributeProxy(node);
        if (nodeProxy.href && isInMonospaceCodeBlock(node) && sameAddress(node.textContent, nodeProxy.href.value)) {
            return content;
        }
        let internalTurndownedContent =
            getTurndownService(yarleOptions).turndown(removeBrackets(node.innerHTML));
        internalTurndownedContent = removeDoubleBackSlashes(internalTurndownedContent);
        if (!nodeProxy.href) {
            return (node.innerHTML === '' || !node.innerHTML)
                ? ''
                : internalTurndownedContent;
        }

        const lexer = new marked.Lexer({});
        const tokens = lexer.lex(internalTurndownedContent) as any;
        const extension = yarleOptions.addExtensionToInternalLinks ? '.md' : '';
        let token: any = {
            mdKeyword: '',
            text: internalTurndownedContent,
        };
        if (tokens.length > 0 && tokens[0]['type'] === 'heading') {
            token = tokens[0];
            token['mdKeyword'] = `${'#'.repeat(tokens[0]['depth'])} `;
        }
        const value = nodeProxy.href ? nodeProxy.href.value : internalTurndownedContent;
        const type = nodeProxy.type ? nodeProxy.type.value : undefined ;
        const realValue = yarleOptions.urlEncodeFileNamesAndLinks ? encodeURI(value) : value;
        const isYarleResource =  Boolean(node.getAttribute('yarle-file-resource'))
        if (type === 'file' || isYarleResource) {
            return isHeptaOrObsidianOutput()
                ? `![[${realValue}]]`
                : getShortLinkIfPossible(token, value);
        }
        
        const isValueEvernoteLink = isEvernoteLink(value);
        if (value.match(/^(https?:|tel:|www\.|file:|busycalevent:|ftp:|mailto:)/) && !isValueEvernoteLink) {
            return getShortLinkIfPossible(token, value);
        }

        const displayName = sanitize(token['text'], {replacement: yarleOptions.replacementChar || '_'}).replace(/[\[\]\#\^]/g, '')

        const mdKeyword = token['mdKeyword'];

        // handle ObsidianMD internal link display name
        const omitObsidianLinksDisplayName = isHeptaOrObsidianOutput()
            && yarleOptions.obsidianSettings?.omitLinkDisplayName;
        const renderedObsidianDisplayName = omitObsidianLinksDisplayName ? '' : `|${displayName}`;

        if (isValueEvernoteLink) {
            const fileName = normalizeFilenameString(token['text']);
            const noteIdNameMap = RuntimePropertiesSingleton.getInstance();
            const uniqueEnd = getUniqueId();
            const id = getEvernoteUniqueId(value)
            if (isTOC(noteIdNameMap.getCurrentNoteName())) {
                noteIdNameMap.addItemToTOCMap({ id, url: value, title: fileName, uniqueEnd  });

            } else {
                noteIdNameMap.addItemToMap({ id, url: value, title: fileName, uniqueEnd  });
            }

            const linkedNoteId = id; // todo add evernotelink value
            if (isHeptaOrObsidianOutput() && !yarleOptions.keepEvernoteLinkIfNoNoteFound) {
                return `${mdKeyword}[[${linkedNoteId}${extension}${renderedObsidianDisplayName}]]`;
            }
            if (yarleOptions.keepEvernoteLinkIfNoNoteFound){
                return `<YARLE_EVERNOTE_LINK>${mdKeyword}[[${linkedNoteId}${extension}${renderedObsidianDisplayName}]]<-->[${displayName}](${linkedNoteId}${extension})</YARLE_EVERNOTE_LINK>`
            }

            return `${mdKeyword}[${displayName}](${mdLinkTarget(`${linkedNoteId}${extension}`)})`;
        }

        return (isHeptaOrObsidianOutput())
        ? `${mdKeyword}[[${realValue}${renderedObsidianDisplayName}]]`
        : (isStandardMdFamily())
            ? `${mdKeyword}[${displayName}](${mdLinkTarget(realValue)})`
            : `${mdKeyword}[[${realValue}]]`;
};

// A link whose content starts with a heading becomes `## [heading](url)`, built from that first
// token alone; the blocks after the heading inside the same link were dropped. Keep them, after
// the heading link, as plain content.
const contentAfterLeadingHeading = (node: any): string => {
    if (!getAttributeProxy(node).href) {
        return '';
    }
    // the same test linkReplacement makes, on the same bracket-stripped text
    const linkText = removeDoubleBackSlashes(getTurndownService(yarleOptions).turndown(removeBrackets(node.innerHTML)));
    const linkTokens = new marked.Lexer({}).lex(linkText) as any;
    if (linkTokens.length === 0 || linkTokens[0]['type'] !== 'heading') {
        return '';
    }
    const fullContent = getTurndownService(yarleOptions).turndown(node.innerHTML);
    const tokens = new marked.Lexer({}).lex(fullContent) as any;
    if (tokens.length === 0 || tokens[0]['type'] !== 'heading') {
        return '';
    }
    const rest = fullContent.slice(tokens[0]['raw'].length).trim();

    return rest ? `\n\n${rest}` : '';
};

export const wikiStyleLinksRule = {
    filter: filterByNodeName('A'),
    replacement: (content: any, node: any) => linkReplacement(content, node) + contentAfterLeadingHeading(node),
};

export const getShortLinkIfPossible = (token: any, value: string): string => {
    return (!token['text'] || _.unescape(token['text']) === _.unescape(value))
                ? yarleOptions.generateNakedUrls ? value : `<${value}>`
                : `${token['mdKeyword']}[${token['text']}](${value})`;
};
