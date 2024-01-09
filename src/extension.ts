// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getPreviousTagOpening, getNextTagOpening } from './eztag_utils';
import { ForwardParser } from './html_parser/eztag_parser';

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
	const tagRange = getPreviousTagOpening(editor, pos);
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
	const tagRange = getNextTagOpening(editor, pos);
	if (tagRange) {
		editor.selection = new vscode.Selection(tagRange.end, tagRange.end);
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insidePrevTag', moveInsidePrevTag));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.insideNextTag', moveInsideNextTag));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ezhtml.showtreeview', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const parser = new ForwardParser(editor.document.getText());
		const tree = parser.parse();
		// vscode.window.createTreeView('tree-view', {
		// 	treeDataProvider: tree
		//   }).reveal(tree.getRoot());
		vscode.window.registerTreeDataProvider("tree-view", tree);
	}));
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