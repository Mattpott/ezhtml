import * as vscode from 'vscode';
import { TagNode } from './html_parser/eztag_parser';

/**
 * The defined class for a custom EZTag. A list of them is stored as a JSON
 * which is read in to maintain user-made tags.
 * 
 * Has fields for name, voidness, transmutation function, and other things
 */
// The user-defined tag JSON should store the following data for each EZTag:
    // 1. The Tag's Name (The tags will be sorted according to this for lookup)
    // 2. Whether the Tag is Void (requires a closing tag) or not
    // 3. The Tag's class list, ID, and other Metadata
    // 4. The collection of tags that the Tag expands to become
        // These tags may include delimiting markers that can be
            // used in order to place content in the associated location
            // These delimiters must be notated to be added to the collection
                // in section 5. Look there for more info on how they work
    // 5. A collection of delimiters which determine how the content of the
        // custom tag in the markup will fit into the expanded tag.
        // The base delimeter is determined by double newlines
            // This essentially parses the tags in the expanded tag and 
                // moves the content as split by the delimiters to have their
                // content be placed within the specified tag
                // For example, if a custom tag "custom" has the defined
                    // expansion of "<outer><inner></inner></outer>",
                    // we could set the tag up as follows:
                        /**
                         * <custom>
                         *          Outer content
                         * 
                         *          Inner content
                         * </custom>
                         */
                    // And the expanded tag would result in:
                        /**
                         * <outer>
                         *     Outer content
                         *     <inner>
                         *         Inner content
                         *     </inner>
                         * </outer>
                         */
        // TODO: Figure out the function for determining placement when
            // using explicit delimiters to place content in associated tags
            // Maybe make it so that, in parsing, each delimeter gets a bucket
                // that stores its content
                // As the content is delimited, it gets pushed to the end of
                // its associated bucket
                // The bucket's content is then fully added in order to
                // the designated location?
    // 6. A user-defined function that takes in the Tag's contents as a String
        // and returns a new String based around that content.
        // This can be left undefined if no function is desired.
        // This function will be stored as a String and evaluated
            // using the JS/TS eval function
// On expansion, any given classes/multi-value metadata should be added 
    // to the expanded tag's classes/associated metadata
// On expansion, any given ID/single-value metadata should overwrite 
    // the expanded tag's ID/single-value metadata
// Figure out a way to have the user enter in custom tag information for
    // storing in the file. This will be done through text input, but
    // I don't know how to present that stuff to the user currently
    // Optimally, I want a clean text box to appear with fields to enter
    // their content in. It should appear as wide as their current editor
    // and probably take up like half of its height or so.
    // Maybe have the larger changes be in their own dropdowns to save 
    // initial space. Advanced details like delimiters and the function
    // should exist here? Maybe the function writing can be in a
    // certain input file which can be opened to allow for writing with
    // TypeScript extensions working?
export class EZTag {
    private name: string;
    private voidness: boolean;
    private func: string;

    public constructor(name: string, voidness: boolean, func: string) {
        this.name = name;
        this.voidness = voidness;
        this.func = func;
    }
    
    public get tagName() {
        return this.name;
    }

    public get isVoid() {
        return this.voidness;
    }

    public get functionString() {
        return this.func;
    }
}

/**
 * Just a simple coupling of start and end offsets for conciseness.
 * 
 * Having either start or end be negative indicates the range is not closed
 * or not fully set.
 */
export class OffsetRange {
    public start: number;
    public end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    get isClosed(): boolean {
        return this.start >= 0 && this.end >= 0;
    }

    /*
     * template of how to create a position based on startPos and offset
     * requires access to the current TextDocument
     * 
     * let doc: TextDocument;
     * const startOffset = doc.offsetAt(startPos);
     * const openingPos: Position = doc.positionAt(startOffset + scanner.getTokenOffset());
     * const closingPos: Position = doc.positionAt(startOffset + scanner.getTokenOffset() + scanner.getTokenLength());
     */
}

export class TagHierarchy implements vscode.TreeDataProvider<TagNode> {
    private root: TagNode = new TagNode(0, [], void 0);
    private orderedView: TagNode[] = [];

    constructor() {
        // this.root.setOpeningTagRange() // set the tag's end to text.length?
    }

    public getRoot(): TagNode {
        return this.root;
    }

    /**
     * Adds the passed child node to the parent node while also adding it
     * to the ordered view for easier iteration.
     * 
     * @param parent 
     * @param child 
     */
    public addChild(parent: TagNode, child: TagNode): void {
        parent.children.push(child);
        this.orderedView.push(child);
    }

    public getOrderedView(): TagNode[] {
        return this.orderedView;
    }

    getChildren(element?: TagNode | undefined): vscode.ProviderResult<TagNode[]> {
        if (element !== undefined) {
            return element.children;
        }
        else {
            return this.root.children;
        }
    }

    getTreeItem(element: TagNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (element.tagName) {
            let state: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
            if (element.children.length > 0) {
                state = vscode.TreeItemCollapsibleState.Expanded;
            }
            return new vscode.TreeItem(element.tagName, state);
        }
        else {
            return new vscode.TreeItem("Unknown");
        }
        
        
    }
}

export interface EZTagParser {
    /**
     * Parses the entire passed text into a tree of HTML elements.
     */
    parse(): TagHierarchy;
}