// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as eztag from './eztag';
import * as html from 'vscode-html-languageservice';

// denotes the max number of lines to search in one pass when looking for tags
const SEARCH_LINE_MAX = 256;

/**
 * Retrieves the Range of the nearest tag before the passed position.
 * 
 * If the position to search from is within an opening tag or directly next
 * to its closing '>', the tag before that tag will be returned
 * if there is one.
 * If the position to search from is within the contents of a tag, this
 * function will return the Range denoting the position's containing tag.
 * If no tag could be found before the passed position, null is returned.
 * 
 * @param curPos the vscode Position to search before for the nearest tag.
 * 
 * @return the vscode Range covering the nearest opening HTML tag before
 *         the intended Position using the RegEx defined in eztag.ts,
 *         or NULL if none was found
 */
export function getPreviousTagOpening(editor: vscode.TextEditor, curPos: vscode.Position): vscode.Range | null {
    if (!editor || !curPos) { 
        return null; 
    }
    const doc = editor.document;
    // let sd: html.HTMLDocument;
    // sd.findNodeBefore(doc.offsetAt()) possible solution if I can gain access to main native HTMLDocument

    // make the opening tag regular expression global
    const GLOBAL_REGEX = new RegExp(eztag.OPEN_TAG_REGEX, "g");
    // check for an opening tag on the position's line preceding the position
    let precText = doc.getText(new vscode.Range(curPos.with({character: 0}), curPos));
    let matches = precText.match(GLOBAL_REGEX);
    if (matches) {
        const lastTag = matches[matches.length - 1];
        // if position is directly next to the end of the opening tag, we ignore that match
        if (precText.endsWith(lastTag)) {
            matches.pop();
        }
        else { // lastTag is the closest preceding tag
            const startOffset = precText.lastIndexOf(lastTag);
            const startPos = curPos.with({character: startOffset});
            const endPos = curPos.with({character: startOffset + lastTag.length});
            return new vscode.Range(startPos, endPos);
        }
    }
    // if no valid matches were on the starting line, search SEARCH_LINE_MAX lines
    // above the starting line at a time until one is found or the top is reached
    let atTop: boolean = false;
    while ((!matches || matches.length === 0) && !atTop) {
        let startLine = curPos.line - SEARCH_LINE_MAX;
        if (startLine <= 0) {
            startLine = 0;
            atTop = true;
        }
        const startPos = doc.lineAt(startLine).range.start;
        // move curPos to start of its line so that line is essentially ignored
        curPos = curPos.with({character: 0});
        precText = doc.getText(new vscode.Range(startPos, curPos));
        // search each line individually so a found tag's Position is known
        // TODO: fix so that tags split over lines are counted properly
        const lines = precText.split("\n");
        let lineDistance = 0;
        while (lineDistance < lines.length) {
            // search lines in reverse order
            precText = lines[(lines.length - 1) - lineDistance];
            matches = precText.match(GLOBAL_REGEX);
            if (matches) {
                // since a match was found, move curPos to the line of that tag
                curPos = curPos.with({line: curPos.line - lineDistance});
                break;
            }
            lineDistance++;
        }
    }
    // there was some match and now curPos is on the line of that matched tag
    if (matches) {
        const matchedTag = matches[matches.length - 1];
        const startOffset = precText.lastIndexOf(matchedTag);
        const startPos = curPos.with({character: startOffset});
        const endPos = curPos.with({character: startOffset + matchedTag.length});
        return new vscode.Range(startPos, endPos);
    }
    else {
        return null;
    }
}

/**
 * Retrieves the Range of the nearest tag after the passed position.
 * 
 * If the position to search from is within an opening tag, the tag after
 * that tag will be returned if there is one.
 * If no tag could be found after the passed position, null is returned.
 * 
 * @param curPos the vscode Position to search after for the nearest tag.
 * 
 * @return the vscode Range covering the nearest opening HTML tag after
 *         the intended Position using the RegEx defined in eztag.ts,
 *         or NULL if none was found
 */
export function getNextTagOpening(editor: vscode.TextEditor, curPos: vscode.Position): vscode.Range | null {
    if (!editor || !curPos) { 
        return null; 
    }
    // setup for parsing for tags
    const doc: vscode.TextDocument = editor.document;
    const service: html.LanguageService = html.getLanguageService();
    let atEnd: boolean = false;
    // scan SEARCH_LINE_MAX lines at a time for an opening tag after curPos
    while (!atEnd) {
        let endLine: number = curPos.line + SEARCH_LINE_MAX;
        if (curPos.line >= doc.lineCount) {
            endLine = doc.lineCount - 1;
        }
        const endPos: vscode.Position = doc.lineAt(endLine).range.end;
        let scan: html.Scanner = service.createScanner(doc.getText(new vscode.Range(curPos, endPos)));
        scan.scan();
    }

    // check for an opening tag on the position's line after the position
    let postText = doc.getText(new vscode.Range(curPos, doc.lineAt(curPos.line).range.end));
    let match = postText.match(eztag.OPEN_TAG_REGEX);
    if (match) {
        // match[0] contains the whole opening tag capture group
        let startOffset = match.index !== undefined ? match.index : postText.indexOf(match[0]);
        startOffset = startOffset + curPos.character;
        const startPos = curPos.with({character: startOffset});
        const endPos = curPos.with({character: startOffset + match[0].length});
        return new vscode.Range(startPos, endPos);
    }
    // if not matched on first line, start at the beginning of the next line
    curPos = curPos.with(curPos.line + 1, 0);
    // if no valid matches were on the starting line, search SEARCH_LINE_MAX lines
    // below the starting line at a time until one is found or the bottom is reached
    let atBottom: boolean = false;
    while (!match && !atBottom) {
        // since the current line of curPos is inclusive, we exclude the last line
        let endLine = curPos.line + SEARCH_LINE_MAX - 1;
        if (endLine >= doc.lineCount) {
            endLine = doc.lineCount - 1;
            atBottom = true;
        }
        let endPos = doc.lineAt(endLine).range.end;
        postText = doc.getText(new vscode.Range(curPos, endPos));
        match = postText.match(eztag.OPEN_TAG_REGEX);
        // if a tag is found, determine its line number by the capture group offset
        // TODO: fix so that tags split over lines are counted properly
        if (match) {
            let offset = match.index !== undefined ? match.index : postText.indexOf(match[0]);
            let lineDistance = 0;
            const lines = postText.split("\n");
            for (const line of lines) {
                offset = offset - line.length;
                if (offset <= 0) {
                    break;
                }
                lineDistance++;
            }
            // update curPos to be inside the matched tag
            offset = offset + lines[lineDistance].length; // get the tag's offset on the line
            curPos = curPos.with(curPos.line + lineDistance, offset);
            break;
        }
    }
    if (match) {
        const endPos = curPos.with({character: curPos.character + match[0].length});
        return new vscode.Range(curPos, endPos);
    }
    else {
        return null;
    }
}

// function getPreviousTag(curTag: eztag.EZTag): eztag.EZTag | null {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) { 
//         return null; 
//     }
//     const doc = editor.document;
//     let prevTag: eztag.EZTag;
//     return prevTag;
// }

// function getNextTag(curTag: eztag.EZTag): eztag.EZTag | null {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) { 
//         return null; 
//     }
//     const doc = editor.document;
//     let nextTag: eztag.EZTag;
//     // initially start parse at start of the inside of the passed tag
//     let parsePos: vscode.Position = curTag.openingTagRange.end;
//     return nextTag;
// }

// ALL OF THIS SHOULD MAYBE STAY IN EXTENSION ONCE I FIX THEIR CONTENTS

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

// JSON DATA STORAGE

// https://code.visualstudio.com/api/extension-guides/virtual-documents
// https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider
// On startup load up the saved custom tags JSON containing a map of EZTags
// The keys for the map should be the EZTag's tag name

// ACTUALLY EXPANDING THE TAG (Ideological)

function getOpeningTag(editor: vscode.TextEditor, pos: vscode.Position): vscode.Selection {
    let tag: vscode.Selection = editor.selection; // temporary

    return tag;
}


function expandCurTag(editor: vscode.TextEditor) {
    if (!editor) {
        return;
    }
    // First, the tag's breadth should be determined
    // Search backward to determine the opening of the current tag
    const doc: vscode.TextDocument = editor.document;
    const opening: String = doc.getText(getOpeningTag(editor, editor.selection.active));
    
    // Once the beginning of the tag is found, extract its tag name
    let tagName = opening.slice(1, -1).split(" ")[0];
    
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