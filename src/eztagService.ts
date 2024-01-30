// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as eztag from './eztag';
import * as html from 'vscode-html-languageservice';
import { CustomTagData, EZTag } from './eztag_types';
import { existsSync } from 'fs';
// import { getECMAScriptEntryFunction } from './importer/dynamicImporter';

// Artifact of previous searching methods
function previousPosition(position: vscode.Position, document: vscode.TextDocument,
    lineDelta: number = 1): vscode.Position {
    if (position.character > 0) {
        return position.translate({ characterDelta: -1 });
    } else {
        let prevLineNum = position.line - lineDelta;
        if (prevLineNum < 0) {
            prevLineNum = 0;
        }
        return document.lineAt(prevLineNum).range.end;
    }
}


/**
 * When creating the EZTag, the given HTML should be parsed by vscode's
 * parser and those nodes should be added to the expansionList with some
 * data removed (the indices for example).
 */
export function expandTag(content: string, tag: EZTag) {
    // TODO: make it so that having the double spaced delimiter works
    // TODO: make it so that void tags work
    // TODO: make it so that attribute data is added when adding expanded opening tag (make tostring for ExpansionTagNode)
    // TODO: ensure having only 1 tag to expand still works
    // TODO: ensure last tag in the bunch still closes and the content is appended (after while loop maybe)

    // TODO: allow for tags with no content by having null delimiters for those tags.
    //       this should be checked for when a new delimiter/end of delimiters is encountered.
    //       when this happens, add the opening tag and its associated closing tag as should occur
    //       depending on voidness and whether it is a block-level tag or not.
    const expansionList = tag.expansionList;
    const openingTags = expansionList.map((node) => node.toString());
    const delimiters: string[] = tag.delimiters;
    let level = -1; // keeps track of how many expanded tags deep we are
    let expandedText: string = '';
    // union the delimiters into one global regex
    const regex = new RegExp(delimiters.join('|'), 'g');
    let match: RegExpExecArray | null = null;
    let curContentStart: number = -1;
    let curContentEnd: number = -1;
    while ((match = regex.exec(content)) !== null) {
        const delimiter: string = match[0];
        // determine how many tags deep we are by comparing the current level
        // of delimiter to that level in the delimiters list
        const newLevel = delimiters.findIndex((val: string) => val === delimiter);
        curContentEnd = match.index;
        if (newLevel > level) { // open new level of expanded tag
            if (expandedText.length !== 0) { // TODO: only do this if associated tag is a block-level tag if possible
                expandedText += '\n';
            }
            expandedText += `${expansionList[newLevel]}\n`; // TODO: requires tostring
        }
        // add content to current expanded tag
        if (curContentStart !== -1) {
            expandedText += content.slice(curContentStart, curContentEnd);
        }
        if (newLevel < level) { // close previous level of expanded tag
            const tagName = expansionList[level].name;
            // TODO: only do this if associated tag is not void
            expandedText += `\n</${tagName}>\n`;
        }
        curContentStart = match.index + delimiter.length;
        level = newLevel;
    }
}

/**
 * TODO: maybe make this return the entry function instead?
 * 
 * @param absPathOrFuncString either the absolute filepath to a script that
 *                            exports the entry function or a string of code
 *                            containing the entry function to execute
 * @returns a Promise containing the processed string or undefined if the
 *          entry function wasn't able to be accessed
 */
export async function executeCustomFunction(absPathOrFuncString: string): Promise<string | undefined> {
    if (absPathOrFuncString.length === 0) { // blank string so no function is run
        return;
    }
    let runner = undefined;
    if (existsSync(absPathOrFuncString)) { // absPathOrFuncString is a filepath, so execute the file
        if (absPathOrFuncString.endsWith('.mjs')) { // ECMAScript so requires hacky access
            // prevent transpiling of the import call into a require call by
            // executing string-based import code to allow for ECMAScript importing
            const retrieveImportFunction = new Function(
                `async function getImport(absPath) {
                    return await import('file://' + absPath);
                }
                return getImport;`
            );
            const importECMAScript = retrieveImportFunction();
            try {
                const mod = await importECMAScript(absPathOrFuncString);
                runner = mod.callme;
            } catch (error: any) {
                vscode.window.showErrorMessage(error.message);
            }
        }
        else { // commonJS works just fine with NodeJS require, so use that instead
            try {
                const mod = require(absPathOrFuncString);
                runner = mod.callme;
            } catch (error: any) {
                vscode.window.showErrorMessage(error.message);
            }
        }
    }
    else { // string isn't blank, so try and get it as a function
        runner = new Function(absPathOrFuncString + 'this.callme = callme;');
        type ExpansionFunction = (contentString: string) => string;
        type RunnerContainer = { callme: ExpansionFunction | undefined };
        const context: RunnerContainer = { callme: undefined };
        // calls the appended 'this.callme = callme' to retrieve the entry function
        runner.call(context);
        runner = context.callme;
    }
    // if we have successfully retrieved the runner function, execute it
    if (runner) {
        return runner('test string');
    }
    return undefined;
}

// JSON DATA STORAGE

// https://code.visualstudio.com/api/extension-guides/virtual-documents
// https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider
// On startup load up the saved custom tags JSON containing a map of EZTags
// The keys for the map should be the EZTag's tag name

// ACTUALLY EXPANDING THE TAG (Ideological)

function getDocumentAsHTMLDocument(doc: vscode.TextDocument): html.TextDocument {
    return {
        uri: doc.uri.toString(),
        languageId: doc.languageId,
        version: doc.version,
        lineCount: doc.lineCount,
        getText: doc.getText,
        offsetAt: doc.offsetAt,
        positionAt: doc.positionAt
    };
}

export function getOpeningTag(editor: vscode.TextEditor, pos: vscode.Position): html.Node {
    // get the service with the current updated custom data set
    const customData = new CustomTagData('eztags', { version: 1.0, tags: [...eztag.getCustomTagMap().values()] });
    const htmlService = html.getLanguageService({ useDefaultDataProvider: true, customDataProviders: [customData] });
    // fix document typing since URI is not expected type
    const doc = getDocumentAsHTMLDocument(editor.document);
    const tree = htmlService.parseHTMLDocument(doc);
    // get the opening node containing the position
    const tag: html.Node = tree.findNodeAt(doc.offsetAt(pos));
    return tag;
}


function expandCurTag(editor: vscode.TextEditor) {
    if (!editor) {
        return;
    }
    // First, the tag's breadth should be determined
    // Search backward to determine the opening of the current tag
    const doc: vscode.TextDocument = editor.document;
    // const opening: String = doc.getText(getOpeningTag(editor, editor.selection.active));

    // Once the beginning of the tag is found, extract its tag name
    // let tagName = opening.slice(1, -1).split(" ")[0];

    // Check the tag against those stored in the map made from loading the JSON
    // Ensure the tag is indeed a custom one
    // If the tag isn't a void one, search forward to find the nearest closure 
    // of the tag's type
    // Ensure there is a closing tag
    // Create a Selection that covers from start of opening tag to end of closing tag
    // Next, get the new text to replace the whole Selection with
    // Scrape the tag's metadata and store them in Strings
    // Get the Selection denoting the tag's content
    // Pass that Selection's String content to the JSON stored function
    // https://javascript.info/eval
    // Once the String is evaluted into new contentm that new String should be
    // split depending on each delimiter associated with the custom tag,
    // ensuring that each String stays associated for later use.
    // Once fully split up, place those Strings in their intended locations
    // in the expanded tag's stored String.
    // TODO figure out how to associate metadata then add it to the expanded tag
    // Finally, replace the Selection with that expanded tag String
    // This is probably easy, just use the API

}