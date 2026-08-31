import fs from 'fs';
import fsExtra from 'fs-extra';
import * as path from 'path';

import { Path } from '../paths';
import { yarleOptions } from '../yarle';

import { getNoteFileName, getNoteName, getUniqueId, normalizeFilenameString } from './filename-utils';
import { OutputFormat } from './../output-format';
import { RuntimePropertiesSingleton } from './../runtime-properties';
import { EvernoteNoteData } from '../models';
import { loggerInfo } from './loggerInfo';

export const paths: Path = {};
const MAX_PATH = 249;

/**
 * Longest `.resources` directory stem, in UTF-16 code units — the unit that both
 * `String.prototype.slice` and the filesystem count.
 *
 * APFS/HFS+ allow 255 units per path component (measured: 255 CJK chars = 765
 * UTF-8 bytes is accepted, 256 is not — the limit is units, NOT bytes), and the
 * stem carries a 10-unit `.resources` suffix, so 245 is the hard ceiling.
 *
 * 150 leaves a wide margin: worst case measured at 649 bytes of a 1024-byte
 * PATH_MAX with an all-CJK stem, while truncating only ~0.1% of real note titles
 * (p99 = 99 chars across 7,005 notes). The previous value of 50 truncated 29%.
 *
 * Keep this generous. The stem is the ONLY thing separating two notes' resource
 * directories, so every truncation is a chance for unrelated notes to share one
 * directory and overwrite each other's attachments. Truncation also used to sever
 * a closing parenthesis mid-name, which silently breaks the Markdown link — see
 * `md-link-target.ts`.
 *
 * `find_orphaned_resources.py` reconstructs these names and carries the same
 * number; change both together.
 */
const RESOURCE_DIR_MAX_LEN = 150;

/**
 * Truncate without splitting a surrogate pair — half an emoji is not a character,
 * and a lone surrogate is not valid UTF-8 for the filesystem to store.
 */
const truncateResourceStem = (stem: string): string => {
  if (stem.length <= RESOURCE_DIR_MAX_LEN) {
    return stem;
  }

  const cut = stem.slice(0, RESOURCE_DIR_MAX_LEN);
  const lastUnit = cut.charCodeAt(cut.length - 1);
  const endsOnLoneHighSurrogate = lastUnit >= 0xD800 && lastUnit <= 0xDBFF;

  return endsOnLoneHighSurrogate ? cut.slice(0, -1) : cut;
};

export const getResourceDir = (dstPath: string, note: EvernoteNoteData): string => {
  return truncateResourceStem(getNoteName(dstPath, note).replace(/\s/g, '_'));
};

export const truncatFileName = (fileName: string, uniqueId: string): string => {

  if (fileName.length <= 11) {
    throw Error('FATAL: note folder directory path exceeds the OS limitation. Please pick a destination closer to the root folder.');
  }

  const fullPath = `${getNotesPath()}${path.sep}${fileName}`;

  return fullPath.length <  MAX_PATH ? fileName : `${fileName.slice(0, MAX_PATH - 11)}_${uniqueId}.md`;
};

const truncateFilePath = (note: EvernoteNoteData, fileName: string, fullFilePath: string): string => {
  const noteIdNameMap = RuntimePropertiesSingleton.getInstance();

  const noteIdMap = noteIdNameMap.getNoteIdNameMapByNoteTitle(normalizeFilenameString(note.title))[0] || {uniqueEnd: getUniqueId()};


  if (fileName.length <= 11) {
    throw Error('FATAL: note folder directory path exceeds the OS limitation. Please pick a destination closer to the root folder.');
  }

  return `${fullFilePath.slice(0, MAX_PATH - 11)}_${noteIdMap.uniqueEnd}.md`;
  // -11 is the nanoid 5 char +_+ the max possible extension of the note (.md vs .html)
};

const getFilePath = (dstPath: string, note: EvernoteNoteData, extension: string): string => {
  const fileName = getNoteFileName(dstPath, note, extension);
  const fullFilePath = `${dstPath}${path.sep}${normalizeFilenameString(fileName)}`;

  return fullFilePath.length < MAX_PATH ? fullFilePath : truncateFilePath(note, fileName, fullFilePath);
};

export const getMdFilePath = (note: EvernoteNoteData): string => {
  return getFilePath(paths.mdPath, note, 'md');
};

export const getJsonFilePath = (note: EvernoteNoteData): string => {
  return getFilePath(paths.mdPath, note, 'json');
};
export const getHtmlFilePath = (note: EvernoteNoteData): string => {
  return getFilePath(paths.resourcePath, note, 'html');
};

export const getHtmlFileLink = (note: EvernoteNoteData): string => {
  const filePath = getHtmlFilePath(note);
  const relativePath = `.${filePath.slice(paths.resourcePath.lastIndexOf(path.sep))}`;
  if (yarleOptions.posixHtmlPath && path.sep !== path.posix.sep) {
    return relativePath.split(path.sep).join(path.posix.sep);
  }
  return relativePath;
};

const clearDistDir = (dstPath: string): void => {
  if (fs.existsSync(dstPath)) {
    fsExtra.removeSync(dstPath);
  }
  fs.mkdirSync(dstPath);
};

export const getRelativeResourceDir = (note: EvernoteNoteData): string => {
  const enexFolder = `${path.sep}${yarleOptions.resourcesDir}`;
  if (yarleOptions.haveGlobalResources) {
    return `..${enexFolder}`;
  }

  return yarleOptions.haveEnexLevelResources
    ? `.${enexFolder}`
    : `.${enexFolder}${path.sep}${getResourceDir(paths.mdPath, note)}.resources`;
};

export const createRootOutputDir = (): void => {
  const outputDir = path.isAbsolute(yarleOptions.outputDir)
  ? yarleOptions.outputDir
  : `${process.cwd()}${path.sep}${yarleOptions.outputDir}`;
  fsExtra.mkdirsSync(outputDir)
}
export const getAbsoluteResourceDir = (note: EvernoteNoteData): string => {
  if (yarleOptions.haveGlobalResources) {
    return path.resolve(paths.resourcePath, '..', '..', yarleOptions.resourcesDir);
  }

  return yarleOptions.haveEnexLevelResources
    ? paths.resourcePath
    : `${paths.resourcePath}${path.sep}${getResourceDir(paths.mdPath, note)}.resources`;
};

const resourceDirClears = new Map<string, number>();
export const clearResourceDir = (note: EvernoteNoteData): void => {
  const resPath = getAbsoluteResourceDir(note);
  if (!resourceDirClears.has(resPath)) {
    resourceDirClears.set(resPath, 0);
  }

  const clears = resourceDirClears.get(resPath);
  // we're sharing a resource dir, so we can can't clean it more than once
  if ((yarleOptions.haveEnexLevelResources || yarleOptions.haveGlobalResources) && clears >= 1) {
    return;
  }

  clearDistDir(resPath);
  resourceDirClears.set(resPath, clears + 1);
};

export const clearResourceDistDir = (): void => {
  clearDistDir(paths.resourcePath);
};
export const clearMdNotesDistDir = (): void => {
  clearDistDir(paths.mdPath);
};

export const setPaths = (enexSource: string): void => {
  // loggerInfo('setting paths');
  const enexFolder = enexSource.split(path.sep);
  // loggerInfo(`enex folder split: ${JSON.stringify(enexFolder)}`);
  let enexFile = (enexFolder.length >= 1 ?  enexFolder[enexFolder.length - 1] : enexFolder[0]).split(/.enex$/)[0];
  enexFile = normalizeFilenameString(enexFile);
  // loggerInfo(`enex file: ${enexFile}`);

  const outputDir = path.isAbsolute(yarleOptions.outputDir)
    ? yarleOptions.outputDir
    : `${process.cwd()}${path.sep}${yarleOptions.outputDir}`;

  paths.mdPath = `${outputDir}${path.sep}notes${path.sep}`;
  paths.resourcePath = `${outputDir}${path.sep}notes${path.sep}${yarleOptions.resourcesDir}`;

  // loggerInfo(`Skip enex filename from output? ${yarleOptions.skipEnexFileNameFromOutputPath}`);
  if (!yarleOptions.skipEnexFileNameFromOutputPath) {
    paths.mdPath = `${paths.mdPath}${enexFile}`;
    // loggerInfo(`mdPath: ${paths.mdPath}`);
    paths.resourcePath = `${outputDir}${path.sep}notes${path.sep}${enexFile}${path.sep}${yarleOptions.resourcesDir}`;
  }

  if (yarleOptions.outputFormat === OutputFormat.LogSeqMD) {
    const folderName = yarleOptions.logseqSettings.journalNotes ? 'journal' : 'pages';
    paths.mdPath = `${outputDir}${path.sep}${folderName}${path.sep}`;
    paths.resourcePath = `${outputDir}${path.sep}${yarleOptions.resourcesDir}`;
  }

  fsExtra.mkdirsSync(paths.mdPath);
  if ((!yarleOptions.haveEnexLevelResources && !yarleOptions.haveGlobalResources) ||
    yarleOptions.outputFormat === OutputFormat.LogSeqMD) {
    fsExtra.mkdirsSync(paths.resourcePath);
  }
  loggerInfo(`path ${paths.mdPath} created`);
  // clearDistDir(paths.simpleMdPath);
  // clearDistDir(paths.complexMdPath);
};

export const getNotesPath = (): string => {
  return paths.mdPath;
};
