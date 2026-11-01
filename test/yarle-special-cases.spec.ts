import assert from 'assert';
import fs from 'fs';
import eol from 'eol';
import mockTimezone from 'timezone-mock';
import * as path from 'path';

import { OutputFormat } from './../src/output-format';
import * as utils from './../src/utils';
import * as yarle from './../src/yarle';
import * as dropTheRopeRunner from './../src/dropTheRopeRunner';
import { YarleOptions } from './../src/YarleOptions';
import { TaskOutputFormat } from '../src/task-output-format';
import { ReplaceType } from '../src/models';

const testDataFolder = `.${path.sep}test${path.sep}data${path.sep}`;

describe('Yarle special cases', async () => {
  before(() => {
    mockTimezone.register('Europe/London');

  });

  after(() => {
    mockTimezone.unregister();

  });

  afterEach(async () => {
    utils.clearMdNotesDistDir();
  });

  it.skip('Empty enex file - throw eoent', async () => {
    let errorHappened = false;
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}do_not_exists.enex` ],
    };
    try {
      await yarle.dropTheRope(options);
    } catch (e) {
      errorHappened = true;
    }
    assert.equal(true, errorHappened);
  });

  it('Custom filename Character map', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}sanitize_fulltest.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      replacementCharacterMap: {
        "<": "lessthan",
        ">": "greaterThan",
        ":": "colon",
        "\"": "apostrophe",
        "/": "backslash",
        "\\": "slash", 
        "|": "line",
        "?": "question",
        "*": "star"
    },
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    console.log(`conversion log: ${fs.readFileSync(utils.LOGFILE)}`);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/sanitize_fulltest/title_lessthangreaterThancolonapostrophebackslashslashlinequestionstar_endOfTitle.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/sanitize_fulltest/_resources/title_lessthangreaterThancolonapostrophebackslashs.resources/imageTitle_lessthangreaterThan-apostrophecolonslashlinequestionstar_endOfImageTitle.pngquestion=imagePostfix_lessthangreaterThan-apostrophecolonslashlinequestionstar_endOfImagePostfix`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/sanitize_fulltest/title_lessthangreaterThancolonapostrophebackslashslashlinequestionstar_endOfTitle.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/sanitize_fulltest/title_lessthangreaterThancolonapostrophebackslashslashlinequestionstar_endOfTitle.md`, 'utf8'),
    );
  });
  it('Replace invalid tags', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-invalid-tags.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      isMetadataNeeded: true,
      removeUnicodeCharsFromTags: true,
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-invalid-tags/invalid-tags.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-invalid-tags/invalid-tags.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-invalid-tags.md`, 'utf8'),
    );
  });
  it('Do not replace invalid tags', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-invalid-tags.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      isMetadataNeeded: true,
      removeUnicodeCharsFromTags: false,
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-invalid-tags/invalid-tags.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-invalid-tags/invalid-tags.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-invalid-tags-keep.md`, 'utf8'),
    );
  });

  it('Replace newlines', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-newlines.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-newlines/test-newlines.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-newlines/test-newlines.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-newlines.md`, 'utf8'),
    );
  });
  it('Replacement settings', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-replacements.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      globalReplacementSettings: [
        {type: ReplaceType.title ,regex: "X", replace: "<replaced_X>"},
        {type: ReplaceType.content ,regex: "a", replace: "<replaced_a>"}
      ]
    };
    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-replacements/NoteX.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-replacements/NoteX.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-replacements-NoteX.md`, 'utf8'),
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-replacements/NoteY.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-replacements/NoteY.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-replacements-NoteY.md`, 'utf8'),
    );

  });


  it.skip('Replacement settings', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}export trial.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      globalReplacementSettings: [
        {type:ReplaceType.title, regex:"\\[",replace:"_"},
        {type:ReplaceType.title,regex:"\\]",replace:"_"},
        {type:ReplaceType.title,regex:"^\\.",replace:""},
        {type:ReplaceType.tag,regex:"^\\.",replace:""},
        {type:ReplaceType.tag,regex:"\\.",replace:"_"}
      ],
      replacementCharacterMap: {
        "[": "",
        "]": ""
      }

    };
    await dropTheRopeRunner.run(options);
  });

  it('Encrypted lines in notes', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-encryption.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      encryptionPasswords: ["wrong_password","password"]
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-encryption/Encryption.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-encryption/Encryption.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-encryption.md`, 'utf8'),
    );
  });

  it('Encrypted lines in notes - no such password', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-encryption.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      encryptionPasswords: ["wrong_password"]
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-encryption/Encryption.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-encryption/Encryption.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-encryption-nopassword.md`, 'utf8'),
    );
  });

  it('Original links - logSeq', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-guid-logseq.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.LogSeqMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      templateFile: `${testDataFolder}evernotelink-template.templ`,
    };
    await dropTheRopeRunner.run(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/pages/Note 1.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/pages/Note 2.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/pages/Note 3.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/pages/Table of Contents.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/pages/Note 1.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-logseq-guid-pages/Note 1.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/pages/Note 2.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-logseq-guid-pages/Note 2.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/pages/Note 3.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-logseq-guid-pages/Note 3.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/pages/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-logseq-guid-pages/Table of Contents.md`, 'utf8'),
    );

  });
  it('Original links', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-original-links.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.ObsidianMD,
      convertPlainHtmlNewlines: true,
      isMetadataNeeded: true,
      templateFile: `${testDataFolder}evernotelink-template.templ`,
    };
    await dropTheRopeRunner.run(options);
    // tslint:disable-next-line:no-console
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteA.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteB.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteC.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-original-links/Table of Contents.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-originallink-EvernoteNoteA.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteB.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-originallink-EvernoteNoteB.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-original-links/EvernoteNoteC.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-originallink-EvernoteNoteC.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-original-links/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-originallink-Table of Contents.md`, 'utf8'),
    );
  });


  it('Enex file with note containing a picture', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-withPicture.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    console.log(`conversion log: ${fs.readFileSync(utils.LOGFILE)}`);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture/test - note with picture.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture/_resources/test_-_note_with_picture.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-withPicture/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-withPicture.md`, 'utf8'),
    );
  });

  it('Override resourcesDir', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-withPicture.enex` ],
      outputDir: 'out',
      resourcesDir: '_attachments',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    // tslint:disable-next-line:no-console
    console.log(`conversion log: ${fs.readFileSync(utils.LOGFILE)}`);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture/test - note with picture.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture/_attachments/test_-_note_with_picture.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-withPicture/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-withPicture-customResourcesDir.md`, 'utf8'),
    );
  });

  it('should keep Html content', async () => {

    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-withPicture-keep-html.enex` ],
      templateFile: `${testDataFolder}keephtml-template.tmpl`,
      outputDir: 'out',
      keepOriginalHtml: true,
    };

    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture-keep-html/test - note with picture.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture-keep-html/_resources/test - note with picture.html`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-withPicture-keep-html/_resources/test_-_note_with_picture.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-withPicture-keep-html/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-withPicture-keep-html.md`, 'utf8'),
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-withPicture-keep-html/_resources/test - note with picture.html`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-note-with-picture.html`, 'utf8'),
    );

  });

  it('normalized notebook name', async () => {

    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-#[notebook]^.enex` ],
      templateFile: `${testDataFolder}keephtml-template.tmpl`,
      outputDir: 'out',
    };

    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-notebook/test -note with text only.md`,
      ),
      true,
    );
  
  });

  it('Multiple sanitized enex files with interEnex links', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${process.cwd()}${path.sep}test${path.sep}data${path.sep}SanitizedLinkedInterNotebooks` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      addExtensionToInternalLinks: true,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,

    };
    await dropTheRopeRunner.run(options);

    // tslint:disable-next-line:no-console
    console.log(`out dir: ${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`);
    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Note2.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Table of Contents.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Table of Contents.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Note in Notebook A.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Note in Notebook A.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Note in Notebook A.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Untitled.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Untitled.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Untitled.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Table of Contents.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Table of Contents.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Note in Notebook B.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Note in Notebook B.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Note in Notebook B.md`, 'utf8'),
    );

  });

  it('Enex file with note containing text and picture', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-textWithImage.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-textWithImage/Untitled.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-textWithImage/_resources/Untitled.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes//test-textWithImage/Untitled.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-textWithImage.md`, 'utf8'),
    );
  });

  it('Colors in text', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}Colors.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      convertColorsToMDHighlight: true,
      plainTextNotesOnly: false,
      outputFormat: OutputFormat.ObsidianMD,
      keepMDCharactersOfENNotes: false,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      
      fs.existsSync(
        `${__dirname}/../out/notes/Colors/Colors.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/Colors/Colors.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/Colors.md`, 'utf8'),
    );
  });
  it('Custom font', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}customfont.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      convertColorsToMDHighlight: true,
      plainTextNotesOnly: false,
      outputFormat: OutputFormat.ObsidianMD,
      keepMDCharactersOfENNotes: false,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      
      fs.existsSync(
        `${__dirname}/../out/notes/customfont/customfont.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/customfont/customfont.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/customfont.md`, 'utf8'),
    );
  });
  it('Absolute paths', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-textWithImage.enex` ],
      outputDir: '/tmp/out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        '/tmp/out/notes/test-textWithImage/Untitled.md',
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        '/tmp/out/notes/test-textWithImage/_resources/Untitled.resources',
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        '/tmp/out/notes//test-textWithImage/Untitled.md',
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-textWithImage.md`, 'utf8'),
    );
  });
  it('Missing links', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}missing-link.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      
      keepEvernoteLinkIfNoNoteFound: true
    };
    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/missing-link/NoteA.md`,
      ),
      true,
    );


    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/missing-link/NoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-missing-link.md`, 'utf8'),
    );
  });
  it('Missing links - no keep ', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}missing-link-nokeep.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      
    };
    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/missing-link-nokeep/NoteA.md`,
      ),
      true,
    );


    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/missing-link-nokeep/NoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-missing-link-nokeep.md`, 'utf8'),
    );
  });
  it('Enex file with multiple notes', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-twoNotes.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/test - note with picture.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/_resources/test_-_note_with_picture.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-twoNotes/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-twoNotes-pic.md`, 'utf8'),
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/test -note with text only.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-twoNotes/test -note with text only.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-twoNotes-text.md`, 'utf8'),
    );
  });
  it('Enex file with multiple notes, same journal notes, Logseq', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-two-logseqNotes.enex` ],
      outputDir: 'out',
      dateFormat: 'YYYY-MM-DD',
      templateFile: `${testDataFolder}template_logseq.tmpl`,
      logseqSettings:{
        journalNotes: true
      },
      outputFormat: OutputFormat.LogSeqMD,

      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/journal/2018-10-06.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/_resources/2018-10-06.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/journal/2018-10-06.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/multiple-notes-in-logseq-journal.md`, 'utf8'),
    );

  });
  it('Enex file with note containing more pictures', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-threePictures.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-threePictures/test - note with more pictures.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-threePictures/_resources/test_-_note_with_more_pictures.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-threePictures/test - note with more pictures.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-threePictures.md`, 'utf8'),
    );
  });
  it('Enex file with tabbed text ', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-normal+tabbed text.enex` ],
      outputDir: 'out',
      trimStartingTabs: true,
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-normal+tabbed text/test-normal+tabbed text.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-normal+tabbed text/test-normal+tabbed text.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-normal+tabbed text.md`, 'utf8'),
    );
  });
  it('Enex file with images using data urls', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [`${testDataFolder}test-image-dataUrl.enex`],
      outputDir: 'out',
      isMetadataNeeded: true,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-image-dataUrl/test - image - dataUrl.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-image-dataUrl/test - image - dataUrl.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-image-dataUrl.md`, 'utf8'),
    );

    // Make sure data-url and en-media resources all exist.
    // (Really, we ought to be checking specific resource contents --
    // e.g., with chai-fs `assert.directoryEqual(outResourcesDir, expectedResourcesDir)`.)
    ['embedded.png', 'embedded.1.svg', 'embedded.2.svg', 'embedded.3.svg', 'photo.png'].forEach(
      resource => assert(
        fs.existsSync(
          `${__dirname}/../out/notes/test-image-dataUrl/_resources/test_-_image_-_dataUrl.resources/${resource}`,
        ),
        `Resource file ${resource} not created`,
      ));
  });

  it('Enex file with three notes with same names', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-3NotesWithSameName.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      skipLocation: false,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-3NotesWithSameName.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.1.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.1.md`,
        'utf8',
      )),
      fs.readFileSync(
        `${__dirname}/data/test-3NotesWithSameName.1.md`,
        'utf8',
      ),
    );

    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.2.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-3NotesWithSameName/Github - $4.00.2.md`,
        'utf8',
      )),
      fs.readFileSync(
        `${__dirname}/data/test-3NotesWithSameName.2.md`,
        'utf8',
      ),
    );
  });

  it('Enex file with internal links underscore', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-links_underline_within.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,
      dateFormat: undefined,

    };
    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links_underline_within/Note_A.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links_underline_within/Note_A.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNote_A.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links_underline_within/Note_B.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links_underline_within/Note_B.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNote_B.md`, 'utf8'),
    );
  });

  it('Enex file with internal links ', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-links.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,

    };
    await dropTheRopeRunner.run(options);

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links/NoteA.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links/NoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNoteA.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links/NoteB.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links/NoteB.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNoteB.md`, 'utf8'),
    );
  });

  it('Enex file with internal Levenshtein links ', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,

      enexSources: [ `${testDataFolder}test-levenshtein-links.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,
      useLevenshteinForLinks: true,


    };
    await dropTheRopeRunner.run(options);

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-levenshtein-links/NoteA.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-levenshtein-links/NoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-levenshtein-linksNoteA.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-levenshtein-links/NoteB.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-levenshtein-links/NoteB.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-levenshtein-linksNoteB.md`, 'utf8'),
    );
  });

  it('Enex file with internal links with extension', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-links-withExtension.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      addExtensionToInternalLinks: true,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,

    };
    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links-withExtension/NoteA.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links-withExtension/NoteA.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNoteA-withExtension.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-links-withExtension/NoteB.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-links-withExtension/NoteB.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-linksNoteB-withExtension.md`, 'utf8'),
    );
  });

  it('Multiple enex files with interEnex links', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${process.cwd()}${path.sep}test${path.sep}data${path.sep}LinkedInterNotebooks` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      addExtensionToInternalLinks: true,
      templateFile: undefined,
      outputFormat: OutputFormat.StandardMD,

    };
    await dropTheRopeRunner.run(options);

    // tslint:disable-next-line:no-console
    console.log(`out dir: ${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`);
    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Note2.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Note2.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Table of Contents.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Table of Contents.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_A/Note in Notebook A.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_A/Note in Notebook A.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_A/Note in Notebook A.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Untitled.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Untitled.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Untitled.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Table of Contents.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Table of Contents.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Table of Contents.md`, 'utf8'),
    );

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/test-internotebook_links_B/Note in Notebook B.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-internotebook_links_B/Note in Notebook B.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/LinkedInterNotebooks/test-internotebook_links_B/Note in Notebook B.md`, 'utf8'),
    );

  });

  it('Multiple untitled note - unregognized guid/link', async () => {
    const options: YarleOptions = {
      templateFile: `${testDataFolder}evernotelink-template.templ`,
      enexSources: [ `${testDataFolder}two-untitled-notes-with-toc.enex` ],
        "isMetadataNeeded": true,
        "isNotebookNameNeeded": false,
        "isZettelkastenNeeded": false,
        "useZettelIdAsFilename": false,
        "plainTextNotesOnly": false,
        "skipLocation": true,
        "skipCreationTime": true,
        "skipUpdateTime": true,
        "skipSourceUrl": true,
        "skipWebClips": false,
        "skipTags": true,
        "useHashTags": true,
        "outputFormat": OutputFormat.ObsidianMD,
        "taskOutputFormat": TaskOutputFormat.ObsidianMD,
        "skipEnexFileNameFromOutputPath": false,
        "keepMDCharactersOfENNotes": false,
        "monospaceIsCodeBlock": false,
        "keepOriginalHtml": true,
        "resourcesDir": "_resources",
        "trimStartingTabs": false,
        "convertPlainHtmlNewlines": false,
        "encryptionPasswords": [
          ""
        ],
        "logseqSettings": {
          "journalNotes": false
        },
        "obsidianSettings": {
          "omitLinkDisplayName": false
        },
        "dateFormat": "YYYY-MM-DD HH:mm",
        "imageSizeFormat": OutputFormat.ObsidianMD,
        "keepImageSize": true,
        "keepOriginalAmountOfNewlines": true,
        "addExtensionToInternalLinks": false,
        "generateNakedUrls": true,
        "urlEncodeFileNamesAndLinks": false,
        "haveEnexLevelResources": false,
        "haveGlobalResources": false,
        "useUniqueUnknownFileNames": true,
        "useLevenshteinForLinks": false,
        "sanitizeResourceNameSpaces": false,
        "replacementChar": "_",
        "replacementCharacterMap": {
          "<": "_",
          ">": "_",
          ":": "_",
          "\"": "_",
          "/": "_",
          "\\": "_",
          "|": "_",
          "?": "_",
          "*": "_"
        }
      
    };
    await dropTheRopeRunner.run(options);

    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/two-untitled-notes-with-toc/Untitled Note.1.md`),
      true,
    );
    assert.equal(
      fs.existsSync(`${__dirname}/../out/notes/two-untitled-notes-with-toc/Untitled Note.md`),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/two-untitled-notes-with-toc/Untitled Note.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/two-untitled-notes-with-toc.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/two-untitled-notes-with-toc/Untitled Note.1.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/two-untitled-notes-with-toc.1.md`, 'utf8'),
    );

  });
  it('Enex file with PDF attachment', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-pdfAttachment.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment/pdfAttachment.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment/_resources/pdfAttachment.resources/sample.pdf`,
      ),
      true,
    );
  });
  it('Enex file with PDF attachment - urlencode', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-URLEncodingLinksAndFiles.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      urlEncodeFileNamesAndLinks: true,
      outputFormat: OutputFormat.ObsidianMD
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-URLEncodingLinksAndFiles/URLEncodedPdfAttachment.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-URLEncodingLinksAndFiles/_resources/URLEncodedPdfAttachment.resources/WLAN-Artikel_der_c't,_Ma%CC%88rz_2016.pdf`,
      ),
      true,
    );
  });
  it('Enex file - href-base64', async () => {
    const options: YarleOptions = {

      enexSources: [ `${testDataFolder}test-webclip-imagelink-base64.enex` ],
      outputDir: 'out',
        isMetadataNeeded: true,
        isNotebookNameNeeded: false,
        isZettelkastenNeeded: false,
        useZettelIdAsFilename: false,
        plainTextNotesOnly: false,
        skipLocation: true,
        skipCreationTime: true,
        skipUpdateTime: true,
        skipSourceUrl: true,
        skipWebClips: false,
        skipTags: true,
        useHashTags: true,
        outputFormat: OutputFormat.ObsidianMD,
        obsidianTaskTag: "",
        taskOutputFormat: TaskOutputFormat.ObsidianMD,
        skipEnexFileNameFromOutputPath: false,
        keepMDCharactersOfENNotes: false,
        monospaceIsCodeBlock: false,
        keepOriginalHtml: false,
        currentTemplate: "---\n{created-at-block}Created at: {created-at}{end-created-at-block}\n{updated-at-block}Last updated at: {updated-at}{end-updated-at-block}\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n---\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n\n{content-block}{content}{end-content-block}\n\n",
        resourcesDir: "_filesFromEN",
        nestedTags: {
          separatorInEN: "_",
          replaceSeparatorWith: "---",
          replaceSpaceWith: "-"
       },
        logseqSettings: { journalNotes: false },
        obsidianSettings: { omitLinkDisplayName: false },
        dateFormat: "YYYY-MM-DD hh:mm",
        imageSizeFormat: OutputFormat.ObsidianMD,
        keepImageSize: true,
        keepOriginalAmountOfNewlines: true,
        addExtensionToInternalLinks: true,
        generateNakedUrls: false,
        urlEncodeFileNamesAndLinks: false,
        haveEnexLevelResources: false,
        haveGlobalResources: true,
        useUniqueUnknownFileNames: false,
        useLevenshteinForLinks: false,
        sanitizeResourceNameSpaces: true,
     
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-webclip-imagelink-base64/test-webclip-imagelink-base64.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-webclip-imagelink-base64/test-webclip-imagelink-base64.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-webclip-imagelink-base64.md`, 'utf8'),
    );
  });
  it.skip('Enex file - nohref', async () => {
    const options: YarleOptions = {

      enexSources: [ `${testDataFolder}test-imagelink-base64.enex` ],
      outputDir: 'out',
        isMetadataNeeded: true,
        isNotebookNameNeeded: false,
        isZettelkastenNeeded: false,
        useZettelIdAsFilename: false,
        plainTextNotesOnly: false,
        skipLocation: true,
        skipCreationTime: true,
        skipUpdateTime: true,
        skipSourceUrl: true,
        skipWebClips: false,
        skipTags: true,
        useHashTags: true,
        outputFormat: OutputFormat.ObsidianMD,
        obsidianTaskTag: "",
        taskOutputFormat: TaskOutputFormat.ObsidianMD,
        skipEnexFileNameFromOutputPath: false,
        keepMDCharactersOfENNotes: false,
        monospaceIsCodeBlock: false,
        keepOriginalHtml: false,
        currentTemplate: "---\n{created-at-block}Created at: {created-at}{end-created-at-block}\n{updated-at-block}Last updated at: {updated-at}{end-updated-at-block}\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n---\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n\n{content-block}{content}{end-content-block}\n\n",
        resourcesDir: "_filesFromEN",
        nestedTags: {
          separatorInEN: "_",
          replaceSeparatorWith: "---",
          replaceSpaceWith: "-"
       },
        logseqSettings: { journalNotes: false },
        obsidianSettings: { omitLinkDisplayName: false },
        dateFormat: "YYYY-MM-DD hh:mm",
        imageSizeFormat: OutputFormat.ObsidianMD,
        keepImageSize: true,
        keepOriginalAmountOfNewlines: true,
        addExtensionToInternalLinks: true,
        generateNakedUrls: false,
        urlEncodeFileNamesAndLinks: false,
        haveEnexLevelResources: false,
        haveGlobalResources: true,
        useUniqueUnknownFileNames: false,
        useLevenshteinForLinks: false,
        sanitizeResourceNameSpaces: true,
        replacementChar: "_",
     
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/Debug/Druckermeldung abschalten.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/Debug/Druckermeldung abschalten.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-webclips.md`, 'utf8'),
    );
  });

  it.skip('Enex file - nohref', async () => {
    const options: YarleOptions = {

      enexSources: [ `${testDataFolder}test-webclip-no-link-in-md.enex` ],
      outputDir: 'out',
        isMetadataNeeded: true,
        isNotebookNameNeeded: false,
        isZettelkastenNeeded: false,
        useZettelIdAsFilename: false,
        plainTextNotesOnly: false,
        skipLocation: true,
        skipCreationTime: true,
        skipUpdateTime: true,
        skipSourceUrl: true,
        skipWebClips: false,
        skipTags: true,
        useHashTags: true,
        outputFormat: OutputFormat.ObsidianMD,
        obsidianTaskTag: "",
        taskOutputFormat: TaskOutputFormat.ObsidianMD,
        skipEnexFileNameFromOutputPath: false,
        keepMDCharactersOfENNotes: false,
        monospaceIsCodeBlock: false,
        keepOriginalHtml: false,
        currentTemplate: "---\n{created-at-block}Created at: {created-at}{end-created-at-block}\n{updated-at-block}Last updated at: {updated-at}{end-updated-at-block}\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n---\n{source-url-block}Source: {source-url}{end-source-url-block}\n{tags-block}Tags: {tags}{end-tags-block}\n\n{content-block}{content}{end-content-block}\n\n",
        resourcesDir: "_filesFromEN",
        nestedTags: {
          separatorInEN: "_",
          replaceSeparatorWith: "---",
          replaceSpaceWith: "-"
       },
        logseqSettings: { journalNotes: false },
        obsidianSettings: { omitLinkDisplayName: false },
        dateFormat: "YYYY-MM-DD hh:mm",
        imageSizeFormat: OutputFormat.ObsidianMD,
        keepImageSize: true,
        keepOriginalAmountOfNewlines: true,
        addExtensionToInternalLinks: true,
        generateNakedUrls: false,
        urlEncodeFileNamesAndLinks: false,
        haveEnexLevelResources: false,
        haveGlobalResources: true,
        useUniqueUnknownFileNames: false,
        useLevenshteinForLinks: false,
        sanitizeResourceNameSpaces: true,
        replacementChar: "_",
     
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/Debug/Druckermeldung abschalten.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/Debug/Druckermeldung abschalten.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-webclips.md`, 'utf8'),
    );
  });

  it('Enex file - link with images', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-webclip-with-image-in-link-2.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      urlEncodeFileNamesAndLinks: true,
      imageSizeFormat: OutputFormat.ObsidianMD,
      keepImageSize: true,
      outputFormat: OutputFormat.ObsidianMD
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-webclip-with-image-in-link-2/Not So Humble Pie_ White Chocolate Caramel Cheesecake.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-webclip-with-image-in-link-2/Not So Humble Pie_ White Chocolate Caramel Cheesecake.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-link-with-images.md`, 'utf8'),
    );
  });
  it('Enex file - link with images - no keep size', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-webclip-with-image-in-link-2.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      urlEncodeFileNamesAndLinks: true,
      outputFormat: OutputFormat.ObsidianMD
    }
    
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-webclip-with-image-in-link-2/Not So Humble Pie_ White Chocolate Caramel Cheesecake.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-webclip-with-image-in-link-2/Not So Humble Pie_ White Chocolate Caramel Cheesecake.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-link-with-images-no-size.md`, 'utf8'),
    );
  });
  it.skip('2 Enex files with the same PDF attachment - global resource folder ', async () => {
    const options: YarleOptions = {
		enexSources: [
			`${testDataFolder}One in Five TIA Patients Go on to Stroke, Even in Current Era.enex`,
		],
		outputDir: 'out',
		keepOriginalHtml: false,
		isMetadataNeeded: true,
		isNotebookNameNeeded: false,
		isZettelkastenNeeded: false,
    useZettelIdAsFilename: false,
		plainTextNotesOnly: false,
		skipWebClips: true,
		useHashTags: false,
		nestedTags: {
			separatorInEN: '_',
			replaceSeparatorWith: '---',
			replaceSpaceWith: '-',
		},
		outputFormat: OutputFormat.LogSeqMD,
		taskOutputFormat: TaskOutputFormat.StandardMD,
		obsidianTaskTag: '',
		urlEncodeFileNamesAndLinks: false,
		sanitizeResourceNameSpaces: false,
		replacementChar: '_',
		pathSeparator: '/',
		resourcesDir: 'assets',
		turndownOptions: {
			headingStyle: 'atx',
		},
		skipLocation: true,
		skipCreationTime: false,
		skipUpdateTime: false,
		skipSourceUrl: false,
		skipTags: false,
		skipEnexFileNameFromOutputPath: false,
		keepMDCharactersOfENNotes: false,
		monospaceIsCodeBlock: false,
		currentTemplate: '{title-block}- #{title}#{end-title-block}\r\n\r\n- \r\n  ---\r\n\r\n\r\n{content-block}{content}{end-content-block}\r\n\r\n- \r\n  ---\r\n\r\n{created-at-block}- _Created at {created-at}._{end-created-at-block}\r\n{updated-at-block}- _Last updated at {updated-at}._{end-updated-at-block}\r\n{source-url-block}- _Source URL []({source-url})._{end-source-url-block}\r\n\r\n\r\n{tags-block}\r\n- Tagged: \r\n- \r\n```\r\n{tags}\r\n```\r\n{end-tags-block}',
		logseqSettings: {
			journalNotes: false,
		},
		obsidianSettings: {
			omitLinkDisplayName: false,
		},
		dateFormat: 'YYYY-MM-DD',
		keepOriginalAmountOfNewlines: true,
		addExtensionToInternalLinks: true,
		generateNakedUrls: true,
		haveEnexLevelResources: true,
		haveGlobalResources: false,
	};
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment/pdfAttachment.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment/_resources/pdfAttachment.resources/sample.pdf`,
      ),
      true,
    );
  });
  it('Enex file with PDF attachment - ObsidianMD format', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-pdfAttachment-ObsidianMD.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      outputFormat: OutputFormat.ObsidianMD,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment-ObsidianMD/pdfAttachment.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-pdfAttachment-ObsidianMD/pdfAttachment.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-pdfAttachment-ObsidianMD.md`, 'utf8'),
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment-ObsidianMD/_resources/pdfAttachment.resources/sample.pdf`,
      ),
      true,
    );
  });
  it('Enex file with PDF attachment, UPPERCASE en-media hash - ObsidianMD format', async () => {
    // Regression: Evernote emits the en-media hash attribute in either case, but the internal
    // lookup key is lowercase hex (md5File.sync). With a case-sensitive match the resource was
    // still written to disk while the link was silently never inserted, so the attachment was
    // dropped and the note rendered as empty. Output must be identical to the lowercase fixture.
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-pdfAttachment-uppercaseHash-ObsidianMD.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      outputFormat: OutputFormat.ObsidianMD,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment-uppercaseHash-ObsidianMD/pdfAttachment.md`,
      ),
      true,
    );
    const noteContent = eol.auto(fs.readFileSync(
      `${__dirname}/../out/notes/test-pdfAttachment-uppercaseHash-ObsidianMD/pdfAttachment.md`,
      'utf8',
    ));
    // the embed link must be present, exactly as for the lowercase-hash fixture
    assert.equal(
      noteContent,
      fs.readFileSync(`${__dirname}/data/test-pdfAttachment-ObsidianMD.md`, 'utf8'),
    );
    assert.equal(
      noteContent.includes('![[./_resources/pdfAttachment.resources/sample.pdf]]'),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-pdfAttachment-uppercaseHash-ObsidianMD/_resources/pdfAttachment.resources/sample.pdf`,
      ),
      true,
    );
  });
  it('Enex file with attachment - extension comes from mime', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-scriptAttachment.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-scriptAttachment/scriptAttachment.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-scriptAttachment/_resources/scriptAttachment.resources/sample.pdf.scpt`,
      ),
      true,
    );
  });

  it('Enex file with reminder', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-reminder.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      skipReminderTime: false,
      skipReminderOrder: false,
      skipReminderDoneTime: false,
      templateFile: `${testDataFolder}reminder_template.templ`,

    };
    await yarle.dropTheRope(options);

    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-reminder/reminders title.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-reminder/reminders title.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test - reminders title.md`, 'utf8'),
    );
  });
  it('Enex file obsidian style', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-twoNotes.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/test - note with picture.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/_resources/test_-_note_with_picture.resources`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-twoNotes/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-obsidianLink.md`, 'utf8'),
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-twoNotes/test -note with text only.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-twoNotes/test -note with text only.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-twoNotes-text.md`, 'utf8'),
    );
  });

  it('Folder of enex files', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${process.cwd()}/test/data/TestDirNotes`],
      outputDir: 'out',
      isMetadataNeeded: true,
      plainTextNotesOnly: false,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: true,
      templateFile: undefined,
    };

    await dropTheRopeRunner.run(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/ExampleNoteInSameDir.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/ExampleNoteInSameDir.1.md`,
      ),
      true,
    );
  });

  it('case sensitive filenames', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-case-sensitive.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}bare_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    const dirList = fs.readdirSync(`${__dirname}/../out/notes/test-case-sensitive/`);
    assert.equal(dirList.includes('TEST - templates just content.md'), true);

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-case-sensitive/TEST - templates just content.md`,
        'utf8',
      )),
      fs.readFileSync(
        `${__dirname}/data/test - templates just content.md`,
        'utf8',
      ),
    );
  });
  it.skip('tasks from Evernote v10+ - no global filter', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}Checkboxes.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      taskOutputFormat: TaskOutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

        isZettelkastenNeeded: false,
        useZettelIdAsFilename: false,
        plainTextNotesOnly: false,
        skipWebClips: false,
        useHashTags: true,
        //outputFormat: "ObsidianMD",
        //taskOutputFormat: "ObsidianMD",
        urlEncodeFileNamesAndLinks: false,
        monospaceIsCodeBlock: false,
        keepMDCharactersOfENNotes: false,
        keepOriginalAmountOfNewlines: false,
        addExtensionToInternalLinks: true,
        nestedTags: {
           separatorInEN: "_",
           replaceSeparatorWith: "/",
           replaceSpaceWith: "-"
        },
        resourcesDir: "_resources",
        turndownOptions: {
           headingStyle: "atx"
        },
        dateFormat: "YYYY-MM-DD",
        haveEnexLevelResources: true,
        haveGlobalResources: false,
        useUniqueUnknownFileNames: false,
        logseqSettings: {
           journalNotes: false
        },
        obsidianSettings: {
           "omitLinkDisplayName": false
        },
        obsidianTaskTag: "gtd"
     
    };

    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
      ),
      true,
    );
  });
  it('tasks from Evernote v10+ - no global filter', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-things-to-do.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      taskOutputFormat: TaskOutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-things-to-do.md`, 'utf8'),
    );
  });

  it('tasks from Evernote v10+ with global filter', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-things-to-do.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      taskOutputFormat: TaskOutputFormat.ObsidianMD,
      obsidianTaskTag: '#globalTaskTag',
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-things-to-do-global-filter.md`, 'utf8'),
    );
  });

  it('tasks from Evernote v10+ standard task', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-things-to-do.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      taskOutputFormat: TaskOutputFormat.StandardMD,
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-things-to-do/Things to do.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-things-to-do-standard.md`, 'utf8'),
    );
  });

  it('really old creation time', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-old-note.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-old-note/Untitled.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-old-note/Untitled.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-old-note.md`, 'utf8'),
    );
  });
  it('dollar signs in the title and body are kept literally', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-dollar-signs.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
    };
    await yarle.dropTheRope(options);
    const noteDir = `${__dirname}/../out/notes/test-dollar-signs`;
    const md = fs.readFileSync(`${noteDir}/Price $29 and $1M plan.md`, 'utf8');

    // String.replace reads `$$` as `$` and `$1`/`$2` as capture groups when the replacement is a string
    assert.ok(md.includes('Rating: $$$$ for dinner, $$$ for lunch.'), 'body dollar signs were collapsed');
    const link = md.match(/(\.\/_resources\/[^\])\n]*\.png)/);
    assert.ok(link, 'no link to the attachment');
    assert.ok(link[1].includes('Price_$29_and_$1M_plan.resources'), `title mangled in link: ${link[1]}`);
    assert.ok(fs.existsSync(`${noteDir}/${link[1]}`), `link does not resolve: ${link[1]}`);
  });

  it('original html: embedded data-url images point into the resources folder', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-dataurl-keep-html.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}keephtml-template.tmpl`,
      keepOriginalHtml: true,
      outputFormat: OutputFormat.ObsidianMD,
    };
    await yarle.dropTheRope(options);
    const resDir = `${__dirname}/../out/notes/test-dataurl-keep-html/_resources`;
    const html = fs.readFileSync(`${resDir}/clip with embedded image.html`, 'utf8');

    // the html sits inside _resources, so its links must not start with ./_resources/
    assert.ok(!html.includes('src="./_resources/'), 'html still has a note-relative image path');
    const src = html.match(/src="(\.\/[^"]*embedded[^"]*\.svg)"/);
    assert.ok(src, 'no embedded image in the html');
    assert.ok(fs.existsSync(`${resDir}/${src[1]}`), `image does not resolve from the html: ${src[1]}`);
  });

  it('data-url link around an attachment keeps both files and links each', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-dataurl-link-over-attachment.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}keephtml-template.tmpl`,
      keepOriginalHtml: true,
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const noteDir = `${__dirname}/../out/notes/test-dataurl-link-over-attachment`;
    const resDir = `${noteDir}/_resources/clip_with_data_link_around_attachment.resources`;
    const read = (f: string) => fs.readFileSync(`${resDir}/${f}`, 'utf8');

    // the data link's name came from the attachment's <img alt> inside it, so it overwrote it
    assert.ok(read('screenshot.png').includes('attachment: the real enex resource'), 'attachment overwritten');
    assert.ok(read('screenshot.1.png').includes('inline: the body data url image'), 'data-url image missing');
    const md = fs.readFileSync(`${noteDir}/clip with data link around attachment.md`, 'utf8');
    assert.ok(md.includes('resources/screenshot.png)'), 'no link to the attachment');
    // ` href=` lost its space (`<ayarle-file-resource=`), so the link to the data image vanished
    assert.ok(md.includes('resources/screenshot.1.png)'), 'no link to the data-url image');
    const html = fs.readFileSync(`${noteDir}/_resources/clip with data link around attachment.html`, 'utf8');
    assert.ok(html.includes('<a yarle-file-resource="true" href="./clip_with_data_link_around_attachment.resources/screenshot.1.png"'),
      'html link to the data-url image is broken');
  });

  it('a list item keeps its own text when a nested list follows it', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-sublist-parent-text.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-sublist-parent-text/sublist parent text.md`, 'utf8');

    // fixSublists replaced the whole parent <li> with its nested list, dropping the item's text
    for (const text of ['Goal in a div', 'Status in a p', 'second paragraph']) {
      assert.ok(md.includes(text), `parent item text lost: ${text}`);
    }
    for (const text of ['hiring, hiring, hiring', 'SERVER', 'Hiring', 'only child of an empty wrapper']) {
      assert.ok(md.includes(text), `nested item text lost: ${text}`);
    }
    // the child stays nested under its parent
    assert.ok(/Goal in a div\n\t+\* hiring, hiring, hiring/.test(md), `child not nested under parent:\n${md}`);
  });

  it('self-closing links stay empty and a heading link keeps the content after it', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-link-selfclosing-heading.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const noteDir = `${__dirname}/../out/notes/test-link-selfclosing-heading`;

    // only the first <a …/> was closed, so the second swallowed the article as its link text
    const clip = fs.readFileSync(`${noteDir}/self-closing links.md`, 'utf8');
    assert.ok(clip.includes('Article headline'), `headline lost:\n${clip}`);
    assert.ok(clip.includes('The article body \\[with brackets\\] must survive.'), `body lost or inside a link:\n${clip}`);
    assert.ok(!/\]\(http:\/\/example\.com\/(two|three)\)/.test(clip), `article became link text:\n${clip}`);

    // a link starting with a heading kept only `## [heading](url)`
    const card = fs.readFileSync(`${noteDir}/heading inside a link.md`, 'utf8');
    assert.ok(card.includes('## [Card headline](http://example.com/post)'), `heading link changed:\n${card}`);
    assert.ok(card.includes('Card teaser paragraph.'), `content after the heading lost:\n${card}`);
    assert.ok(card.includes('Second teaser line.'), `content after the heading lost:\n${card}`);
  });

  it('keeps non-ASCII edge whitespace out of inline marks, and fences inline code with line breaks', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-edge-whitespace-inline-code.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-edge-whitespace-inline-code/edge whitespace and inline code.md`, 'utf8');

    // turndown trimmed the full-width spaces at the start of the <font> away
    assert.ok(md.includes('\u3000\u3000。唐'), `full-width spaces lost:\n${md}`);
    // the non-breaking space ended up inside the delimiters: `**  1 2**` does not render as bold
    assert.ok(/\*\*1 2\*\*/.test(md), `bold not closed around its text:\n${md}`);
    assert.ok(!/\*\*\s+1 2/.test(md), `bold opens with whitespace:\n${md}`);
    // `# …` lines inside a multi-line code span render as headings
    assert.ok(md.includes('```\n# ipkg update\n# ipkg upgrade\n# ipkg install git\n```'), `inline code with line breaks not fenced:\n${md}`);
    assert.ok(md.includes('run `ls -la` now'), `single-line inline code changed:\n${md}`);
  });

  it('a list item starting with a block keeps its bullet and its content out of a code block', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-list-item-blocks.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-list-item-blocks/list items with blocks.md`, 'utf8');

    // the leading blank lines of a <p> were read as an indent depth: no bullet, tab-indented content
    assert.ok(/^1\. \*\*2\.2\. Formatting\.\*\* Full artist names\./m.test(md), `first item lost its number:\n${md}`);
    assert.ok(/^2\. \*\*2\.3\. Composers\.\*\* Track level only\./m.test(md), `second item lost its number:\n${md}`);
    assert.ok(/^\* ONE$/m.test(md), `bullet lost:\n${md}`);
    assert.ok(/^\* plain item$/m.test(md), `plain item changed:\n${md}`);
    // nothing indented deeper than one level of item content (that renders as a code block)
    assert.ok(!/^\t\t/m.test(md), `content indented into a code block:\n${md}`);
  });

  it('a <pre> keeps all its text and its line breaks in a fenced block', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-preformatted.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-preformatted/preformatted blocks.md`, 'utf8');

    // turndown's code block read only the <pre>'s first child: `$ ` without the command
    assert.ok(md.includes('```\n$ sudo port install git\n```'), `<pre> text lost:\n${md}`);
    // a <pre> without <code> was plain text, its line breaks gone
    assert.ok(md.includes('```\nCommand output line one\nline two\nline three\n```'), `<pre> line breaks lost:\n${md}`);
    assert.ok(md.includes('```\nsingle code child\n```'), `simple <pre><code> changed:\n${md}`);
  });

  it('marks a highlight only for real colour, not black, grey or a font marker', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-colour-highlight.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
      convertColorsToMDHighlight: true,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-colour-highlight/colour highlight.md`, 'utf8');

    // any colour at all, the page's own near-black text included, became ==highlight==
    for (const plain of ['near black body text', 'grey caption', 'evernote font marker', 'white background']) {
      assert.ok(md.includes(plain) && !md.includes(`==${plain}==`), `not a highlight: ${plain}\n${md}`);
    }
    for (const marked of ['red warning', 'yellow background', 'evernote highlight']) {
      assert.ok(md.includes(`==${marked}==`), `highlight lost: ${marked}\n${md}`);
    }
    // a coloured span inside a highlight was wrapped twice: `====…====`
    assert.ok(md.includes('==red inside a highlight==') && !md.includes('===='), `highlight nested:\n${md}`);
  });

  it('bold and italic that Markdown cannot open or close fall back to HTML', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-emphasis-flanking.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-emphasis-flanking/emphasis flanking.md`, 'utf8');

    // `**…changed?**The` does not close: punctuation before the delimiter, a letter after it
    assert.ok(md.includes('<strong>Interview: How has the company changed?</strong>The first thing'), `bold not closed:\n${md}`);
    // `是**「書」**字` does not open: a letter before, punctuation after
    assert.ok(md.includes('是<strong>「書」</strong>字'), `CJK bold not opened:\n${md}`);
    // `_` never works inside a word, and CJK text has no spaces
    assert.ok(md.includes('香草<em>花草</em>也'), `CJK italic not rendered:\n${md}`);
    // where Markdown works, it stays Markdown
    assert.ok(md.includes('a **plain bold** b and _plain italic_ c'), `plain emphasis changed:\n${md}`);
    assert.ok(md.includes('「**書**」'), `bold between punctuation changed:\n${md}`);
    // two bold elements side by side made `**小明****A:**`, which no reader parses
    assert.ok(md.includes('**小明**<strong>A:</strong> next'), `adjacent bolds collide:\n${md}`);
    assert.ok(md.includes('**小明**<strong>B:</strong> next'), `adjacent bold spans collide:\n${md}`);
  });

  it('a table caption becomes a paragraph above the table', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-table-caption.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-table-caption/table caption.md`, 'utf8');

    // the GFM plugin has no caption rule: the caption landed on the delimiter row and broke the table
    assert.ok(md.includes('付款方式\n\n| 信用卡類型 | 信用卡卡號 |\n| --- | --- |\n| VISA | …1234 |'), `caption breaks the table:\n${md}`);
  });

  it('a code block nested in another opens one fence, not two', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-nested-code.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
      monospaceIsCodeBlock: true,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-nested-code/nested code.md`, 'utf8');

    // the monospace <div> around a <pre> fenced it again: an empty block, then the code unfenced
    assert.ok(md.includes('one\n\n```\n  apache2 @2.2.25_0\n  bash @4.2.45_1\n```\n\ntwo'), `pre in a monospace div:\n${md}`);
    // likewise a monospace line inside an Evernote code block
    assert.ok(md.includes('two\n```\nport install foo\n```\nthree'), `monospace line in a code block:\n${md}`);
    assert.ok(md.includes('three\n```\na = 1\nb = 2\n```\nfour'), `plain code block changed:\n${md}`);
    assert.ok(!/```\n\s*\n```/.test(md), `empty fence:\n${md}`);
  });

  it('keeps bold and italic set by CSS on blocks and other elements', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-css-emphasis.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-css-emphasis/css emphasis.md`, 'utf8');

    // only <b>/<i> and styled <span>s were converted; the same styling on a <div>, <p>, <td>… was dropped
    assert.ok(md.includes('_Dry mixing colored pencils_'), `italic caption lost:\n${md}`);
    assert.ok(md.includes('**Bold line one**') && md.includes('**Bold line two**'), `bold lines lost:\n${md}`);
    assert.ok(md.includes('**a bold nested paragraph with** a normal part **inside**'), `bold paragraph wrong:\n${md}`);
    assert.ok(md.includes('**inner block**'), `bold inherited by a child block lost:\n${md}`);
    assert.ok(md.includes('| **cell** | plain |'), `bold cell lost:\n${md}`);
    assert.ok(md.includes('**Author** says'), `bold cite lost:\n${md}`);
    assert.ok(md.includes('**[a link](http://example.com)**'), `bold around a link lost:\n${md}`);
    // a heading is bold already, and normal weight is not bold
    assert.ok(md.includes('### Heading\n'), `heading changed:\n${md}`);
    assert.ok(md.includes('\nnot bold\n'), `normal weight changed:\n${md}`);
    // an icon-font glyph (private use) counts as punctuation in pandoc: `****Reply` stays literal
    assert.ok(md.includes('[<strong>\uf112</strong>Reply](http://example.com/reply)'), `icon glyph bold:\n${md}`);
    assert.ok(!md.includes('****'), `bolds collide across an empty element:\n${md}`);
  });

  it('keeps underline and strikethrough set by CSS, <ins>, and <sup>/<sub>', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-decorations.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.PortableMD,
    };
    await yarle.dropTheRope(options);
    const md = fs.readFileSync(`${__dirname}/../out/notes/test-decorations/decorations.md`, 'utf8');

    // only <u> and <s>/<del> were converted; the same styling written in CSS was dropped
    assert.ok(md.includes('a <u>css underline</u> b'), `CSS underline lost:\n${md}`);
    assert.ok(md.includes('c ~~css strike~~ d'), `CSS strikethrough lost:\n${md}`);
    assert.ok(md.includes('~~whole struck paragraph~~'), `struck paragraph lost:\n${md}`);
    assert.ok(md.includes('e <u>inserted</u> f'), `<ins> lost:\n${md}`);
    assert.ok(md.includes('H<sub>2</sub>O and x<sup>2</sup>'), `sub/sup lost:\n${md}`);
    // a link is underlined anyway, and a plain <s> is unchanged
    assert.ok(md.includes('g [a link](http://example.com) h'), `link changed:\n${md}`);
    assert.ok(md.includes('i ~~plain strike~~ j'), `<s> changed:\n${md}`);
  });

  it('really long filename', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-long-note.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

    };
    await yarle.dropTheRope(options);
    const expectedFileNamePrefix = 'This is going to be a really reallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreally';

    const fileList = fs.readdirSync(`${__dirname}/../out/notes/test-long-note`);
    assert.equal(fileList.filter(fileName => fileName.startsWith(expectedFileNamePrefix)).length, 1);

  });

  it('really long filename - original html keeps its extension and its link resolves', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-long-note.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}keephtml-template.tmpl`,
      keepOriginalHtml: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,
    };
    await yarle.dropTheRope(options);
    const prefix = 'This is going to be a really really';
    const noteDir = `${__dirname}/../out/notes/test-long-note`;

    const resources = fs.readdirSync(`${noteDir}/_resources`).filter(f => f.startsWith(prefix));
    assert.deepEqual(resources.filter(f => f.endsWith('.md')), [], 'sidecar was written as .md');
    assert.equal(resources.filter(f => f.endsWith('.html')).length, 1);

    const mdFile = fs.readdirSync(noteDir).find(f => f.startsWith(prefix) && f.endsWith('.md'));
    const md = fs.readFileSync(`${noteDir}/${mdFile}`, 'utf8');
    const link = md.match(/\.\/_resources\/([^\]\)\n]*?\.html)/);
    assert.ok(link, 'no link to the original html in the note');
    assert.ok(fs.existsSync(`${noteDir}/_resources/${link[1]}`), `link does not resolve: ${link[1]}`);
  });

  it('really long filename - with link', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-long-linked-notes.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      obsidianSettings: {omitLinkDisplayName: false},
      skipEnexFileNameFromOutputPath: false,

    };
    await dropTheRopeRunner.run(options);
    const expectedFileNamePrefix = 'This is going to be a really really';

    const fileList = fs.readdirSync(`${__dirname}/../out/notes/test-long-linked-notes`);
    assert.equal(fileList.filter(fileName => fileName.startsWith(expectedFileNamePrefix)).length, 1);

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-long-linked-notes/NoteB.md`,
        'utf8',
      )).includes('evernote://'),
      false,
    );

  });

  it('yaml tags array', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-noteWithTags.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}tags-array_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-noteWithTags/test -note with text only.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-noteWithTags/test -note with text only.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test -note with tags array.md`, 'utf8'),
    );
  });

  it('yaml tags list', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `${testDataFolder}test-noteWithTags-yaml-list.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}tags-yaml-list_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-noteWithTags-yaml-list/test -note with text only - yaml-list-tags.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-noteWithTags-yaml-list/test -note with text only - yaml-list-tags.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test -note with text only - yaml-list-tags.md`, 'utf8'),
    );
  });
  it('dots in enex file name', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}test.dots.in.enex.File.Name.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}tags-array_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test.dots.in.enex.File.Name/test.dots.in.enex.File.Name.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test.dots.in.enex.File.Name/test.dots.in.enex.File.Name.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test.dots.in.enex.File.Name.md`, 'utf8'),
    );
  });

  it('case insensitive file names', async () => {
    const options: YarleOptions = {
      dateFormat: undefined,
      enexSources: [ `${testDataFolder}case-insensitive.enex` ],
      outputDir: 'out',
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false,

    };
    await yarle.dropTheRope(options);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/case-insensitive/test abc.1.md`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/case-insensitive/test ABC.md`,
      ),
      true,
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/case-insensitive/test ABC.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test ABC.md`, 'utf8'),
    );
    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/case-insensitive/test abc.1.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test abc.1.md`, 'utf8'),
    );

  });
});

describe('Yarle error cases', async () => {
  before(() => {
    mockTimezone.register('Europe/London');

  });

  after(() => {
    mockTimezone.unregister();

  });

  it('really long filePath', async () => {
    const options: YarleOptions = {
      enexSources: [ `${testDataFolder}test-justText.enex` ],
      outputDir: 'out/longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglongfolderName',
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.ObsidianMD,
      skipEnexFileNameFromOutputPath: false,

    };
    try {
      await yarle.dropTheRope(options);
      assert.equal(true, false);
    } catch (e: any) {

      assert.equal(e.message.startsWith('ENAMETOOLONG: name too long') || e.message.startsWith('EINVAL: invalid argument, mkdir'), true);
    }
  });

  it('Tana recognization', async () => {
    const options: YarleOptions = {
      dateFormat:  "YYYY-MM-DD",
      enexSources: [ `${testDataFolder}test-tana-notes.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}sampleTemplate_tana.tmpl`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.Tana,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false, // IMPORTANT, IT HAS TO BE FALSE
      generateNakedUrls: true // IMPORTANT, IT HAS TO BE TRUE

    };
    await dropTheRopeRunner.run(options);

  });
  it('Tana recognization - highlights', async () => {
    const options: YarleOptions = {
      dateFormat:  "YYYY-MM-DD",
      enexSources: [ `${testDataFolder}tana-highlight-test.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}sampleTemplate_tana.tmpl`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.Tana,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false, // IMPORTANT, IT HAS TO BE FALSE
      generateNakedUrls: true // IMPORTANT, IT HAS TO BE TRUE

    };
    await dropTheRopeRunner.run(options);

  });
  it('Tana recognization - table', async () => {
    const options: YarleOptions = {
      dateFormat:  "YYYY-MM-DD",
      enexSources: [ `${testDataFolder}test-tana-02.enex` ],
      outputDir: 'out',
      templateFile: `${testDataFolder}sampleTemplate_tana.tmpl`,
      isMetadataNeeded: true,
      outputFormat: OutputFormat.Tana,
      skipEnexFileNameFromOutputPath: false,
			skipTags: false,
			useHashTags: false, // IMPORTANT, IT HAS TO BE FALSE
      generateNakedUrls: true // IMPORTANT, IT HAS TO BE TRUE

    };
    await dropTheRopeRunner.run(options);

  });

  
  it('Heptabase', async () => {
    const options: YarleOptions = {
dateFormat: undefined,
      enexSources: [ `.${path.sep}test${path.sep}data${path.sep}test-hepta.enex` ],
      outputDir: 'out',
      outputFormat: OutputFormat.Heptabase,
      templateFile: `${testDataFolder}full_template.templ`,
      isMetadataNeeded: true,
    };
    await dropTheRopeRunner.run(options);
    // tslint:disable-next-line:no-console
    console.log(`conversion log: ${fs.readFileSync(utils.LOGFILE)}`);
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-hepta.zip`,
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        `${__dirname}/../out/notes/test-hepta/test - note with picture.md`,
      ),
      true,
    );

    assert.equal(
      eol.auto(fs.readFileSync(
        `${__dirname}/../out/notes/test-hepta/test - note with picture.md`,
        'utf8',
      )),
      fs.readFileSync(`${__dirname}/data/test-hepta.md`, 'utf8'),
    );
  });
});
