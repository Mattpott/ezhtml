import * as l10n from '@vscode/l10n'; // for localization
import { TokenType, Scanner, ScannerState } from 'vscode-html-languageservice';

/**
 * A utility class for parsing HTML tokens from a string which stores positional data
 * and allows for easy traversal of the string for lexing.
 * 
 * Copied and adapted pretty closely from Microsoft's VSCode html-languageservice MultiLineStream:
 * https://github.com/microsoft/vscode-html-languageservice/blob/main/src/parser/htmlScanner.ts
 * Adapted on January 3rd, 2024.
 * 
 * License from Microsoft:
 * Copyright (c) Microsoft
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
class MultiLineStream {

	private source: string;
	private len: number;
	private position: number;

	constructor(source: string, position: number) {
		this.source = source;
		this.len = source.length;
		this.position = position;
	}

	public eos(): boolean {
		return this.len <= this.position;
	}

	public getSource(): string {
		return this.source;
	}

	public pos(): number {
		return this.position;
	}

	public goBackTo(pos: number): void {
		this.position = pos;
	}

	public goBack(n: number): void {
		this.position -= n;
	}

	public advance(n: number): void {
		this.position += n;
	}

	public goToEnd(): void {
		this.position = this.source.length;
	}

	public nextChar(): number {
		return this.source.charCodeAt(this.position++) || 0;
	}

	public peekChar(n: number = 0): number {
		return this.source.charCodeAt(this.position + n) || 0;
	}

	public advanceIfChar(ch: number): boolean {
		if (ch === this.source.charCodeAt(this.position)) {
			this.position++;
			return true;
		}
		return false;
	}

	public advanceIfChars(ch: number[]): boolean {
		let i: number;
		if (this.position + ch.length > this.source.length) {
			return false;
		}
		for (i = 0; i < ch.length; i++) {
			if (this.source.charCodeAt(this.position + i) !== ch[i]) {
				return false;
			}
		}
		this.advance(i);
		return true;
	}

	public advanceIfRegExp(regex: RegExp): string {
		const str = this.source.substr(this.position);
		const match = str.match(regex);
		if (match) {
			this.position = this.position + match.index! + match[0].length;
			return match[0];
		}
		return '';
	}

	public advanceUntilRegExp(regex: RegExp): string {
		const str = this.source.substr(this.position);
		const match = str.match(regex);
		if (match) {
			this.position = this.position + match.index!;
			return match[0];
		} else {
			this.goToEnd();
		}
		return '';
	}

	public advanceUntilChar(ch: number): boolean {
		while (this.position < this.source.length) {
			if (this.source.charCodeAt(this.position) === ch) {
				return true;
			}
			this.advance(1);
		}
		return false;
	}

	public advanceUntilChars(ch: number[]): boolean {
		while (this.position + ch.length <= this.source.length) {
			let i = 0;
			for (; i < ch.length && this.source.charCodeAt(this.position + i) === ch[i]; i++) {
			}
			if (i === ch.length) {
				return true;
			}
			this.advance(1);
		}
		this.goToEnd();
		return false;
	}

	public skipWhitespace(): boolean {
		const n = this.advanceWhileChar(ch => {
			return ch === _WSP || ch === _TAB || ch === _NWL || ch === _LFD || ch === _CAR;
		});
		return n > 0;
	}

	public advanceWhileChar(condition: (ch: number) => boolean): number {
		const posNow = this.position;
		while (this.position < this.len && condition(this.source.charCodeAt(this.position))) {
			this.position++;
		}
		return this.position - posNow;
	}
}

// shared character codes for ease of comparison
const _BNG = '!'.charCodeAt(0);
const _MIN = '-'.charCodeAt(0);
const _LAN = '<'.charCodeAt(0);
const _RAN = '>'.charCodeAt(0);
const _FSL = '/'.charCodeAt(0);
const _EQS = '='.charCodeAt(0);
const _DQO = '"'.charCodeAt(0);
const _SQO = '\''.charCodeAt(0);
const _NWL = '\n'.charCodeAt(0);
const _CAR = '\r'.charCodeAt(0);
const _LFD = '\f'.charCodeAt(0);
const _WSP = ' '.charCodeAt(0);
const _TAB = '\t'.charCodeAt(0);

/**
 * Dictionary of exceptional cases where a '/' character may appear that
 * doesn't designate a closing tag.
 */
/* eslint-disable @typescript-eslint/naming-convention*/ 
const htmlScriptContents: { [key: string]: boolean } = {
	'text/x-handlebars-template': true,
	// Fix for https://github.com/microsoft/vscode/issues/77977
	'text/html': true,
};
/* eslint-enable */

/**
 * A class which lexes HTML tokens from a string.
 * Copied and adapted pretty closely from Microsoft's VSCode html-languageservice scanner:
 * https://github.com/microsoft/vscode-html-languageservice/blob/main/src/parser/htmlScanner.ts
 * Adapted on January 3rd, 2024.
 * 
 * License from Microsoft:
 * Copyright (c) Microsoft
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
export class EZTagLexer implements Scanner {
    private stream: MultiLineStream;
    private state: ScannerState;
	private tokenOffset: number;
	private tokenType: TokenType;
	private tokenError: string | undefined;

	private hasSpaceAfterTag: boolean;
	private lastTag: string;
	private lastAttributeName: string | undefined;
	private lastTypeValue: string | undefined;

    private emitPseudoCloseTags: boolean;

    constructor(text: string, initialOffset = 0, initialState: ScannerState = ScannerState.WithinContent, emitPseudoCloseTags = false) {
        this.stream = new MultiLineStream(text, initialOffset);
        this.state = initialState;
        this.tokenOffset = 0;
        this.tokenType = TokenType.Unknown;

        this.hasSpaceAfterTag = false;
        this.lastTag = "";

        this.emitPseudoCloseTags = emitPseudoCloseTags;
    }

    getTokenType(): TokenType {
        return this.tokenType;
    }

    getTokenOffset(): number {
        return this.tokenOffset;
    }

    getTokenLength(): number {
        return this.stream.pos() - this.tokenOffset;
    }

    getTokenEnd(): number {
        return this.stream.pos();
    }

    getTokenText(): string {
        return this.stream.getSource().substring(this.tokenOffset, this.stream.pos());
    }

    getScannerState(): ScannerState {
        return this.state;
    }

    getTokenError(): string | undefined {
        return this.tokenError;
    }

    nextElementName(): string {
        return this.stream.advanceIfRegExp(/^[_:\w][_:\w-.\d]*/).toLowerCase();
    }
    
    nextAttributeName(): string {
        return this.stream.advanceIfRegExp(/^[^\s"'></=\x00-\x0F\x7F\x80-\x9F]*/).toLowerCase();
    }

    finishToken(offset: number, type: TokenType, errorMessage?: string): TokenType {
        this.tokenType = type;
        this.tokenOffset = offset;
        this.tokenError = errorMessage;
        return type;
    }

    scan(): TokenType {
        const offset = this.stream.pos();
        const oldState = this.state;
        const token = this.internalScan();
        if (token !== TokenType.EOS && offset === this.stream.pos()
            && !(this.emitPseudoCloseTags && (token === TokenType.StartTagClose || token === TokenType.EndTagClose))) {
            console.warn('Scanner.scan has not advanced at offset ' + offset + ', state before: ' + oldState + ' after: ' + this.state);
            this.stream.advance(1);
            return this.finishToken(offset, TokenType.Unknown);
        }
        return token;
    }

    internalScan(): TokenType {
        const offset = this.stream.pos();
        if (this.stream.eos()) {
            return this.finishToken(offset, TokenType.EOS);
        }
        let errorMessage;
    
        switch (this.state) {
            case ScannerState.WithinComment:
                if (this.stream.advanceIfChars([_MIN, _MIN, _RAN])) { // -->
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.EndCommentTag);
                }
                this.stream.advanceUntilChars([_MIN, _MIN, _RAN]); // -->
                return this.finishToken(offset, TokenType.Comment);
            case ScannerState.WithinDoctype:
                if (this.stream.advanceIfChar(_RAN)) {
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.EndDoctypeTag);
                }
                this.stream.advanceUntilChar(_RAN); // >
                return this.finishToken(offset, TokenType.Doctype);
            case ScannerState.WithinContent:
                if (this.stream.advanceIfChar(_LAN)) { // <
                    if (!this.stream.eos() && this.stream.peekChar() === _BNG) { // !
                        if (this.stream.advanceIfChars([_BNG, _MIN, _MIN])) { // <!--
                            this.state = ScannerState.WithinComment;
                            return this.finishToken(offset, TokenType.StartCommentTag);
                        }
                        if (this.stream.advanceIfRegExp(/^!doctype/i)) {
                            this.state = ScannerState.WithinDoctype;
                            return this.finishToken(offset, TokenType.StartDoctypeTag);
                        }
                    }
                    if (this.stream.advanceIfChar(_FSL)) { // /
                        this.state = ScannerState.AfterOpeningEndTag;
                        return this.finishToken(offset, TokenType.EndTagOpen);
                    }
                    this.state = ScannerState.AfterOpeningStartTag;
                    return this.finishToken(offset, TokenType.StartTagOpen);
                }
                this.stream.advanceUntilChar(_LAN);
                return this.finishToken(offset, TokenType.Content);
            case ScannerState.AfterOpeningEndTag:
                const tagName = this.nextElementName();
                if (tagName.length > 0) {
                    this.state = ScannerState.WithinEndTag;
                    return this.finishToken(offset, TokenType.EndTag);
                }
                if (this.stream.skipWhitespace()) { // white space is not valid here
                    return this.finishToken(offset, TokenType.Whitespace, l10n.t('Tag name must directly follow the open bracket.'));
                }
                this.state = ScannerState.WithinEndTag;
                this.stream.advanceUntilChar(_RAN);
                if (offset < this.stream.pos()) {
                    return this.finishToken(offset, TokenType.Unknown, l10n.t('End tag name expected.'));
                }
                return this.internalScan();
            case ScannerState.WithinEndTag:
                if (this.stream.skipWhitespace()) { // white space is valid here
                    return this.finishToken(offset, TokenType.Whitespace);
                }
                if (this.stream.advanceIfChar(_RAN)) { // >
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.EndTagClose);
                }
                if (this.emitPseudoCloseTags && this.stream.peekChar() === _LAN) { // <
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.EndTagClose, l10n.t('Closing bracket missing.'));
                }
                errorMessage = l10n.t('Closing bracket expected.');
                break;
            case ScannerState.AfterOpeningStartTag:
                this.lastTag = this.nextElementName();
                this.lastTypeValue = void 0;
                this.lastAttributeName = void 0;
                if (this.lastTag.length > 0) {
                    this.hasSpaceAfterTag = false;
                    this.state = ScannerState.WithinTag;
                    return this.finishToken(offset, TokenType.StartTag);
                }
                if (this.stream.skipWhitespace()) { // white space is not valid here
                    return this.finishToken(offset, TokenType.Whitespace, l10n.t('Tag name must directly follow the open bracket.'));
                }
                this.state = ScannerState.WithinTag;
                this.stream.advanceUntilChar(_RAN);
                if (offset < this.stream.pos()) {
                    return this.finishToken(offset, TokenType.Unknown, l10n.t('Start tag name expected.'));
                }
                return this.internalScan();
            case ScannerState.WithinTag:
                if (this.stream.skipWhitespace()) {
                    this.hasSpaceAfterTag = true; // remember that we have seen a whitespace
                    return this.finishToken(offset, TokenType.Whitespace);
                }
                if (this.hasSpaceAfterTag) {
                    this.lastAttributeName = this.nextAttributeName();
                    if (this.lastAttributeName.length > 0) {
                        this.state = ScannerState.AfterAttributeName;
                        this.hasSpaceAfterTag = false;
                        return this.finishToken(offset, TokenType.AttributeName);
                    }
                }
                if (this.stream.advanceIfChars([_FSL, _RAN])) { // />
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.StartTagSelfClose);
                }
                if (this.stream.advanceIfChar(_RAN)) { // >
                    if (this.lastTag === 'script') {
                        if (this.lastTypeValue && htmlScriptContents[this.lastTypeValue]) {
                            // stay in html
                            this.state = ScannerState.WithinContent;
                        } else {
                            this.state = ScannerState.WithinScriptContent;
                        }
                    } else if (this.lastTag === 'style') {
                        this.state = ScannerState.WithinStyleContent;
                    } else {
                        this.state = ScannerState.WithinContent;
                    }
                    return this.finishToken(offset, TokenType.StartTagClose);
                }
                if (this.emitPseudoCloseTags && this.stream.peekChar() === _LAN) { // <
                    this.state = ScannerState.WithinContent;
                    return this.finishToken(offset, TokenType.StartTagClose, l10n.t('Closing bracket missing.'));
                }
                this.stream.advance(1);
                return this.finishToken(offset, TokenType.Unknown, l10n.t('Unexpected character in tag.'));
            case ScannerState.AfterAttributeName:
                if (this.stream.skipWhitespace()) {
                    this.hasSpaceAfterTag = true;
                    return this.finishToken(offset, TokenType.Whitespace);
                }
    
                if (this.stream.advanceIfChar(_EQS)) {
                    this.state = ScannerState.BeforeAttributeValue;
                    return this.finishToken(offset, TokenType.DelimiterAssign);
                }
                this.state = ScannerState.WithinTag;
                return this.internalScan(); // no advance yet - jump to WithinTag
            case ScannerState.BeforeAttributeValue:
                if (this.stream.skipWhitespace()) {
                    return this.finishToken(offset, TokenType.Whitespace);
                }
                let attributeValue = this.stream.advanceIfRegExp(/^[^\s"'`=<>]+/);
                if (attributeValue.length > 0) {
                    if (this.stream.peekChar() === _RAN && this.stream.peekChar(-1) === _FSL) { // <foo bar=http://foo/>
                        this.stream.goBack(1);
                        attributeValue = attributeValue.substring(0, attributeValue.length - 1);
                    }
                    if (this.lastAttributeName === 'type') {
                        this.lastTypeValue = attributeValue;
                    }
                    if (attributeValue.length > 0) {
                        this.state = ScannerState.WithinTag;
                        this.hasSpaceAfterTag = false;
                        return this.finishToken(offset, TokenType.AttributeValue);
                    }
                }
                const ch = this.stream.peekChar();
                if (ch === _SQO || ch === _DQO) {
                    this.stream.advance(1); // consume quote
                    if (this.stream.advanceUntilChar(ch)) {
                        this.stream.advance(1); // consume quote
                    }
                    if (this.lastAttributeName === 'type') {
                        this.lastTypeValue = this.stream.getSource().substring(offset + 1, this.stream.pos() - 1);
                    }
                    this.state = ScannerState.WithinTag;
                    this.hasSpaceAfterTag = false;
                    return this.finishToken(offset, TokenType.AttributeValue);
                }
                this.state = ScannerState.WithinTag;
                this.hasSpaceAfterTag = false;
                return this.internalScan(); // no advance yet - jump to WithinTag
            case ScannerState.WithinScriptContent:
                // see http://stackoverflow.com/questions/14574471/how-do-browsers-parse-a-script-tag-exactly
                let sciptState = 1;
                while (!this.stream.eos()) {
                    const match = this.stream.advanceIfRegExp(/<!--|-->|<\/?script\s*\/?>?/i);
                    if (match.length === 0) {
                        this.stream.goToEnd();
                        return this.finishToken(offset, TokenType.Script);
                    } else if (match === '<!--') {
                        if (sciptState === 1) {
                            sciptState = 2;
                        }
                    } else if (match === '-->') {
                        sciptState = 1;
                    } else if (match[1] !== '/') { // <script
                        if (sciptState === 2) {
                            sciptState = 3;
                        }
                    } else { // </script
                        if (sciptState === 3) {
                            sciptState = 2;
                        } else {
                            this.stream.goBack(match.length); // to the beginning of the closing tag
                            break;
                        }
                    }
                }
                this.state = ScannerState.WithinContent;
                if (offset < this.stream.pos()) {
                    return this.finishToken(offset, TokenType.Script);
                }
                return this.internalScan(); // no advance yet - jump to content
            case ScannerState.WithinStyleContent:
                this.stream.advanceUntilRegExp(/<\/style/i);
                this.state = ScannerState.WithinContent;
                if (offset < this.stream.pos()) {
                    return this.finishToken(offset, TokenType.Styles);
                }
                return this.internalScan(); // no advance yet - jump to content
        }
    
        this.stream.advance(1);
        this.state = ScannerState.WithinContent;
        return this.finishToken(offset, TokenType.Unknown, errorMessage);
    }
}