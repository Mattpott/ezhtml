// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// file for defining the overarching content of an eztag object
// separate from the typical utils defined on it
// essentially a header for the eztag definitions

// denotes regex used for parsing opening tags
// the forward-slashes at beginning and end denote the opening/closing of regex
// the parens denote a capture group, which then saves the content within for later backreference
// the [^\/!] denotes to not match a forward slash or exclamation point after the '<' as
// these indicate a closing tag and comment, respectively
// the . means any non-line terminating char
// the *? makes the . match either 0 or unlimited times, stopping upon fitting criteria 
// as few times as possible as otherwise it would eat closing > until unable to eat more
// IMPORTANT: non-global regular expression, so must be converted if used for that purpose
// the s flag makes it so the tag can extend over multiple lines as the '.' captures newlines
export const OPEN_TAG_REGEX: RegExp = /(<([^\/!].*?)>)/s;

/*
 * 
 * 
 * 
 */
export class EZTag {
    openingTagRange: vscode.Range;
    closingTagRange: vscode.Range;
    #activeEditor: vscode.TextEditor; // '#' denotes private I believe
    
	constructor(openingTagRange: vscode.Range, closingTagRange: vscode.Range,
                activeEditor: vscode.TextEditor) {
		this.openingTagRange = openingTagRange;
        this.closingTagRange = closingTagRange;
        this.#activeEditor = activeEditor;
	}

    get contentText(): String {
        const contentStart = this.openingTagRange.end;
        const contentEnd = this.closingTagRange.start;
        const doc = this.#activeEditor.document;
        return doc.getText(new vscode.Range(contentStart, contentEnd)).trim();
    }
}