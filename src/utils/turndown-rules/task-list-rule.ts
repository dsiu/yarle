import { OutputFormat } from '../../output-format';
import { yarleOptions } from '../../yarle';
import { getLanguageItems } from './../../outputLanguages/LanguageFactory';

import { getAttributeProxy } from './get-attribute-proxy';
import { checkboxDone, checkboxTodo } from './../../constants';
const indentCharacter = '	';
export const taskListRule = {
    filter: 'li',
    replacement: (content: any, node: any, options: any) => {

        const isTodoDoneBlock = (node: any)  => {
            const nodeProxy = getAttributeProxy(node);
            const taskFlag = '--en-checked:true;';

            return nodeProxy.style && nodeProxy.style.value.indexOf(taskFlag) >= 0;
        };
        const isTodoBlock = (node: any)  => {
            const nodeProxy = getAttributeProxy(node);
            const taskFlag = '--en-checked:false;';

            return nodeProxy.style && nodeProxy.style.value.indexOf(taskFlag) >= 0;
        };

        // Leading newlines are read as a nesting depth, which drops the bullet. That is meant for an
        // item that only wraps a nested list; an item opening with a <p> or another block also
        // starts with newlines, lost its bullet, and its tab-indented content became a code block.
        const children = Array.from(node.childNodes) as Array<any>;
        const firstElementIndex = children.findIndex(child => child.nodeType === 1);
        // Only for an item that holds nothing but the nested list: one with text after it (a web
        // comment: the author list, then the comment) lost its bullet and its first line was
        // indented by the count of blank lines.
        const opensWithNestedList = firstElementIndex >= 0
            && ['UL', 'OL'].includes(children[firstElementIndex].nodeName)
            && children.every((child, i) => i === firstElementIndex || (child.textContent || '').trim() === '');
        const indentCount  = opensWithNestedList ? (content.match(/^\n*/)[0].length || 0) : 0;
        const indentChars = indentCharacter.repeat(indentCount);

        const todoPrefix = yarleOptions.outputFormat === OutputFormat.LogSeqMD ? '' :
        node.parentElement?.nodeName?.toUpperCase() === 'LI' ? '' : `${indentChars}- `;


        // continuation lines are indented past the marker: a tab covers up to four columns, so from
        // item 100 on (`100. `) a tab fell short and the item's later paragraphs became a code block
        // (only a number counts: a task's `- [ ] ` has its content after `- `, as GFM reads it)
        const continuation = (marker: string) =>
            /^\d+\. $/.test(marker) && marker.length > 4 ? ' '.repeat(marker.length) : indentCharacter;
        const indentLines = (marker: string) => content
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '\n') // Replace trailing newlines with just a single one
            .replace(/\n/gm, `\n${continuation(marker)}`); // Indent
        const languageItems = getLanguageItems(yarleOptions.outputFormat);

        let prefix =  indentCount > 0
            ? indentChars
            : (isTodoDoneBlock(node)
                ? `${checkboxDone} `
                : (isTodoBlock(node)
                    ? `${checkboxTodo} `
                    : languageItems.listItem))
                    ;
        const parent = node.parentNode;
        if (parent.nodeName === 'OL') {
            const start = parent.getAttribute('start');
            const index = Array.prototype.indexOf.call(parent.children, node);
            prefix = `${(start ? Number(start) + index : index + 1)}. `;
        }
        const singleLineContent = indentLines(prefix);

        let ret;

        ret = (prefix + singleLineContent + (node.nextSibling && !/\n$/.test(singleLineContent) ? '\n' : ''));

        return ret;
}};
