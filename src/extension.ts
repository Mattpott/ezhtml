// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {getPreviousTagOpening, getNextTagOpening} from './eztag_utils';

// Lazily grabs the next Tag in the document forward from the current one
// or returns null upon an error occurring
// class TagIterator implements Iterable<EZTag | null> {
//     [Symbol.iterator]()	{
//         let counter = 0;
//         return {
//             next: () => {
//                 return {
//                     done: counter >= 5,
//                     value: new EZTag('TODO', new vscode.Position(0, 0)) // TODO
//                 };
//             }
//         };
//     }
// }


// /*
//  * Gets the offset of the inside of the desired opening tag relative to the
//  * line the tag is on, moving the cursor to be at that position.
// */
// function updateToInsideTag(parsePosition: vscode.Position, editor: vscode.TextEditor,
// 						   doc: vscode.TextDocument) {
// 	const tagLine = doc.lineAt(parsePosition);
// 	const text = tagLine.text.substring(parsePosition.character);
// 	const matchedTag = text.match(eztag.OPEN_TAG_REGEX);
// 	if (matchedTag) {
// 		// get index of character denoting end of regex
// 		const charOffset = text.split(eztag.OPEN_TAG_REGEX)[0].length 
// 		+ matchedTag[0].length + parsePosition.character;
// 		const newPosition = new vscode.Position(tagLine.lineNumber, charOffset);
// 		editor.selection = new vscode.Selection(newPosition, newPosition);
// 	}
// }

function moveInsidePrevTag() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const pos = editor.selection.active;
	const tagRange = getPreviousTagOpening(pos);
	if (tagRange) {
		editor.selection = new vscode.Selection(tagRange.end, tagRange.end);
	}
}

function moveInsideNextTag() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const pos = editor.selection.active;
	const tagRange = getNextTagOpening(pos);
	if (tagRange) {
		editor.selection = new vscode.Selection(tagRange.end, tagRange.end);
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insidePrevTag', moveInsidePrevTag));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insideNextTag', moveInsideNextTag));
}

// This method is called when your extension is deactivated
export function deactivate() {}
