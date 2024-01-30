// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getCustomTagMap } from './eztag';
import { EZTag } from './eztag_types';
import { getOpeningTag } from './eztagService';
import { executeCustomFunction } from './eztagService';

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

// function moveInsidePrevTag() {
// 	const editor = vscode.window.activeTextEditor;
// 	if (!editor) {
// 		return;
// 	}
// 	const pos = editor.selection.active;
// 	const tagRange = getPreviousTagOpening(editor, pos);
// 	if (tagRange) {
// 		editor.selection = new vscode.Selection(tagRange.end, tagRange.end);
// 	}
// }

// function moveInsideNextTag() {
// 	const editor = vscode.window.activeTextEditor;
// 	if (!editor) {
// 		return;
// 	}
// 	const pos = editor.selection.active;
// 	const tagRange = getNextTagOpening(editor, pos);
// 	if (tagRange) {
// 		editor.selection = new vscode.Selection(tagRange.end, tagRange.end);
// 	}
// }

function getTagRange() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const pos = editor.selection.active;
	const node = getOpeningTag(editor, pos);
	const startTagStart = editor.document.positionAt(node.start);
	if (node.startTagEnd) {
		const startTagEnd = editor.document.positionAt(node.startTagEnd);
		editor.selection = new vscode.Selection(startTagStart, startTagEnd);
	}
	else {
		const endTagEnd = editor.document.positionAt(node.end);
		editor.selection = new vscode.Selection(startTagStart, endTagEnd);
	}
}

async function executeThing() {
	let returned: string | undefined;
	// returned = await executeCustomFunction('C:/Users/mapot/Desktop/modules/commonjsTest.js');
	// returned = await executeCustomFunction('C:/Users/mapot/Desktop/modules/ecmascriptjsTest.mjs');
	// returned = await executeCustomFunction("function poop(teehee) { return 'poop';} function callme(teehee) { return `${teehee} and also ${poop(teehee)}`;}");
	// returned = await executeCustomFunction('balls');
	if (returned) {
		vscode.window.showInformationMessage(returned);
	}
	const pernis = 'there once was a man from nantucket. he was a man';
	const reg = /man/g;
	const poggers = reg.exec(pernis);
	const pog2 = reg.exec(pernis);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insidePrevTag', moveInsidePrevTag));
	// context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insideNextTag', moveInsideNextTag));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.getTagRange', getTagRange));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.execute', executeThing));
}

// This method is called when your extension is deactivated
export function deactivate() {}

// class TagMover implements vscode.CodeActionProvider {
	
// 	public static readonly providedActionKinds = [
// 		vscode.CodeActionKind.Source
// 	];

// 	provideCodeActions(document: vscode.TextDocument, range: vscode.Selection | vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
		
// 	}
// }