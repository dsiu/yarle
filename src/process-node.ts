import { EOL } from 'os';

import { applyTemplate } from './utils/templates/templates';
import {
  getMetadata,
  getTags,
  hasResource,
  saveHtmlFile,
  saveMdFile,
} from './utils';
import { yarleOptions } from './yarle';
import { prepareContentByExtractingDataUrlResources, processResources } from './process-resources';
import { convertHtml2MdContent } from './convert-html-to-md';
import { convert2Html } from './convert-to-html';
import { EvernoteNoteData, NoteData } from './models/NoteData';
import { loggerInfo } from './utils/loggerInfo';
import { RuntimePropertiesSingleton } from './runtime-properties';
import { LanguageFactory } from './outputLanguages/LanguageFactory';
import { performRegexpOnTitle } from './utils/get-title';

export const processNode = (pureNote: EvernoteNoteData, notebookName: string): void => {

  const dateStarted: Date = new Date();
  loggerInfo(EOL);
  loggerInfo(`Conversion started at ${dateStarted}`);

  const runtimeProps = RuntimePropertiesSingleton.getInstance();
  runtimeProps.setCurrentNoteName(pureNote.title);

  // Evernote splits a note body into several CDATA sections when the HTML itself contains
  // "]]>" (common in web clips with inline scripts), and the parser then hands us an array.
  // Join it once here: processResources() and others read pureNote.content directly and
  // threw "content.match is not a function", silently dropping the whole note.
  if (Array.isArray(pureNote.content)) {
    pureNote.content = pureNote.content.join('');
  }


  let noteData: NoteData = {
    created: pureNote.created,
    title: performRegexpOnTitle(yarleOptions, pureNote.title),
    noteName: pureNote.title,
    content: Array.isArray(pureNote.content) ? pureNote.content.join('') : pureNote.content,
    originalContent: pureNote.content,
  };

  // tslint:disable-next-line:no-console
  loggerInfo(`Converting note "${noteData.title}"...`);

  try {
    let htmlContent = noteData.content; 
    if (hasResource(pureNote)) {
      htmlContent = processResources(pureNote);
    }
    htmlContent = prepareContentByExtractingDataUrlResources(pureNote, htmlContent);

    noteData.markdownContent = convertHtml2MdContent(yarleOptions, htmlContent);
    noteData = {...noteData, ...getMetadata(pureNote, notebookName)};
    noteData.tags = getTags(pureNote);

    noteData.appliedMarkdownContent = applyTemplate(noteData, yarleOptions);
    // tslint:disable-next-line:no-console
    // loggerInfo(`data =>\n ${JSON.stringify(data)} \n***`);
    const langaugeFactory = new LanguageFactory();
    const targetLanguage = langaugeFactory.createLanguage(yarleOptions.outputFormat)

    targetLanguage.noteProcess(yarleOptions, noteData, pureNote)

    if (yarleOptions.keepOriginalHtml) {
      noteData.htmlContent = htmlContent;
      convert2Html(noteData);
      saveHtmlFile(noteData, pureNote);
    }

  } catch (e) {
    // JSON.stringify(Error) is "{}", which used to hide every failure's cause; log the stack,
    // and on stderr too, so a dropped note cannot pass for a successful run.
    const detail = e instanceof Error ? (e.stack || e.message) : JSON.stringify(e);
    loggerInfo(`Failed to convert note: ${noteData.title}, ${detail}`);
    // tslint:disable-next-line:no-console
    console.error(`YARLE FAILED TO CONVERT NOTE: ${noteData.title}\n${detail}`);
  }
  // tslint:disable-next-line:no-console
  const dateFinished: Date = new Date();
  const conversionDuration = (dateFinished.getTime() - dateStarted.getTime()) / 1000; // in seconds.
  loggerInfo(`Conversion finished at ${dateFinished}`);
  loggerInfo(`Note "${noteData.title}" converted successfully in ${conversionDuration} seconds.`);

};
