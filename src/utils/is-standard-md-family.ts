import { yarleOptions } from '../yarle';
import { OutputFormat } from './../output-format';

/**
 * Formats that emit standard Markdown links `[text](target)` rather than
 * `[[wikilinks]]`.
 *
 * This exists so the family is named in ONE place. `outputFormat` is never
 * validated, and the link rule's final branch falls back to wikilinks, so a
 * format missing from that condition silently emits the wrong syntax instead
 * of failing loudly.
 */
export const isStandardMdFamily = (): boolean => {
    return yarleOptions.outputFormat === OutputFormat.StandardMD
        || yarleOptions.outputFormat === OutputFormat.LogSeqMD
        || yarleOptions.outputFormat === OutputFormat.PortableMD;
};
