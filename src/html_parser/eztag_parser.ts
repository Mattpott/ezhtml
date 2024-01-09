import {
    LanguageService, getLanguageService, getDefaultHTMLDataProvider, IHTMLDataProvider, TokenType
} from "vscode-html-languageservice";
import { Position } from 'vscode';
import * as eztag from '../eztag';
import { EZTag, EZTagParser, OffsetRange, TagHierarchy } from '../eztag_types';

/**
 * The following TagNode and ForwardParser classes are adapted pretty closely from
 * Microsoft's VSCode html-languageservice parser, which can be found here:
 * https://github.com/microsoft/vscode-html-languageservice/blob/main/src/parser/htmlParser.ts
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


/**
 * 
 */
export class TagNode {
    public tagName: string | undefined;
    public openingTag: OffsetRange;
    public closingTag: OffsetRange;
    public children: TagNode[];
    public parent: TagNode | undefined;
    public attributes: { [name: string]: string | null } | undefined;
    public isVoid: boolean = false;
    public isClosed: boolean = false;
    public isCustom: boolean = false;

    
	public constructor(openingTagStart: number, children: TagNode[], parent?: TagNode) {
        this.openingTag = new OffsetRange(openingTagStart, -1);
        this.closingTag = new OffsetRange(-1, -1);
        this.children = children;
        this.parent = parent;
	}

    public isSameTag(otherName: string | undefined) {
        if (this.tagName === undefined) {
            return otherName === undefined;
        }
        else {
            return otherName !== undefined && this.tagName.length === otherName.length
                   && this.tagName.toLowerCase() === otherName.toLowerCase();
        }
    }
}

/**
 * A class which parses HTML tokens using an HTML Lexer.
 */
export class ForwardParser implements EZTagParser {
    private service: LanguageService = getLanguageService();
    private voidTags: Set<string>;
    private customTags: Map<string, EZTag>;

    private text: string;

    constructor(text: string) {
        this.text = text;
        
        const standardProvider: IHTMLDataProvider = getDefaultHTMLDataProvider();
        // TODO: may want to abstract this similarly to vscode with the data providers in case
        // users have other providers that they use or something?
        this.voidTags = new Set();
        standardProvider.provideTags().filter(tag => tag.void).forEach(tag => this.voidTags.add(tag.name));
        this.customTags = eztag.getCustomTagMap();
        for (const tag of this.customTags.values()) {
            if (tag.isVoid) {
                this.voidTags.add(tag.tagName);
            }
        }
    }

    /**
     * Parses the entire passed text into a tree of HTML elements
     */
    public parse(): TagHierarchy {
        // TODO: look at TSDoc stuff for documentation
        const tagTree = new TagHierarchy();
        // may want to call create scanner with (text, undefined, undefined, true) as parameters
        // depends on if I want to have pseudo close tags emitted, which means encountering a new
        // opening/closing tag before the current opening/closing tag ends auto ends it and returns a
        // StartTagClose/EndTagClose token with an error rather than an Unknown one
        const scanner = this.service.createScanner(this.text);
        let curNode: TagNode = tagTree.getRoot();
        let endTagStart: number = -1;
        let endTagName: string | undefined = undefined;
        let pendingAttribute: string | null = null;
        let token: TokenType = scanner.scan();
        // token is initially assumed to be TokenType.WithinContent
        while (token !== TokenType.EOS) {
            switch (token) {
                case TokenType.StartTagOpen: {
                    // new tag opened, so add to children list of current tag
                    const child: TagNode = new TagNode(scanner.getTokenOffset(), [], curNode);
                    tagTree.addChild(curNode, child);
                    // descend into the tree
                    curNode = child;
                    break;
                }
                case TokenType.StartTag: {
                    curNode.tagName = scanner.getTokenText();
                    break;
                }
                case TokenType.StartTagClose: {
                    if (curNode.parent) {
                        if (scanner.getTokenLength()) {
                            // TODO: this should always run since emitPseudoCloseTags is false?
                            curNode.openingTag.end = scanner.getTokenEnd();
                            if (curNode.tagName) {
                                curNode.isCustom = this.customTags.has(curNode.tagName);
                                if (this.voidTags.has(curNode.tagName)) {
                                    // current opening tag is void, so it closes and we ascend back up the tree
                                    curNode.isClosed = true;
                                    curNode = curNode.parent;
                                    curNode.isVoid = true;
                                }
                            }
                        }
                        else {
                            // pseudoclosed tag was emitted, so move up in tree as though it was closed
                            curNode = curNode.parent;
                        }
                    }
                    break;
                }
                case TokenType.StartTagSelfClose: {
                    if (curNode.parent) {
                        // ascend up in the tree since curNode is fully closed
                        curNode.isClosed = true;
                        curNode.openingTag.end = scanner.getTokenEnd();
                        curNode = curNode.parent;
                        curNode.isVoid = true;
                    }
                    break;
                }
                case TokenType.EndTagOpen: {
                    // can get offset of the start of the end tag
                    curNode.closingTag.start = scanner.getTokenOffset();
                    // TODO: new end tag has been found, so prep new name? might want to store list of names instead?
                    endTagName = undefined;
                    break;
                }
                case TokenType.EndTag: {
                    // token stores the name of the end tag
                    endTagName = scanner.getTokenText().toLowerCase();
                    break;
                }
                case TokenType.EndTagClose: {
                    // ascend up in the tree if the correct node is closed
                    let tempNode: TagNode = curNode;
                    // search up the current node's parents for which node this closes
                    while (!tempNode.isSameTag(endTagName) && tempNode.parent) {
                        tempNode = tempNode.parent;
                    }
                    if (tempNode.parent) {
                        // we haven't reached the null root node, so the closing tag matched with some open tag
                        while (curNode !== tempNode) {
                            // move up to tempNode's level in the tree now since its children
                            // now are not closeable due to tempNode being closed
                            curNode = curNode.parent!;
                        }
                        curNode.isClosed = true;
                        curNode.closingTag.start = endTagStart;
                        curNode.closingTag.end = scanner.getTokenEnd();
                        curNode = curNode.parent!;
                    }
                    break;
                }
                case TokenType.AttributeName: { // parses attribute name (e.g. 'class' or 'id')
                    pendingAttribute = scanner.getTokenText();
                    if (!curNode.attributes) {
                        // initialize attribute dictionary
                        curNode.attributes = {};
                    }
                    curNode.attributes[pendingAttribute] = null; // placeholder value for valueless attributes
                    break;
                }
                case TokenType.AttributeValue: { // parses attribute value (e.g. classnames or ids)
                    if (curNode.attributes && pendingAttribute) {
                        curNode.attributes[pendingAttribute] = scanner.getTokenText();
                        pendingAttribute = null;
                    }
                    break;
                }
            }
            token = scanner.scan(); // advance to next token
        }
        // close any dangling tags appropriately
        while (curNode.parent) {
            curNode.isClosed = curNode.isVoid || false;
            curNode = curNode.parent;
        }
        return tagTree;
    }
}