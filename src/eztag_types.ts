import * as vscode from 'vscode';
import { HTMLDataV1, IAttributeData, IHTMLDataProvider, ITagData, IValueData } from 'vscode-html-languageservice';

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
export class EZTag implements ITagData {
    public name: string;
    public attributes: IAttributeData[];
    public void?: boolean | undefined;
    private _expansionList: ExpansionTagNode[];
    private _delimiters: string[];
    private _func: string;

    public constructor(name: string, voidness: boolean = false, expansionList: ExpansionTagNode[],
                       delimiters: string[], func: string) {
        this.name = name;
        this.attributes = [];
        this.void = voidness;
        this._expansionList = expansionList;
        this._delimiters = delimiters;
        this._func = func;
    }

    public get tagName() {
        return this.name;
    }

    public get isVoid() {
        return this.void;
    }

    public get expansionList() {
        return this._expansionList;
    }

    public get delimiters() {
        return this._delimiters;
    }

    public get functionString() {
        return this._func;
    }
}

/**
 * Essentially just a stripped-down version of vscode's html-languageservice's
 * Node class to not include the unnecessary positional fields.
 * @see vscode-html-languageservice.Node
 */
class ExpansionTagNode {
    private _name: string;
    private _children: ExpansionTagNode[];
    private _parent?: ExpansionTagNode;
    private _attributes?: {
        [name: string]: string | null;
    } | undefined;

    public constructor(name: string, children: ExpansionTagNode[] = [], parent?: ExpansionTagNode,
                       attributes?: { [name: string]: string | null; }) {
        this._name = name;
        this._children = children;
        this._parent = parent;
        this._attributes = attributes;
    }
    
    public get name(): string {
        return this._name;
    }
    
    public get children(): ExpansionTagNode[] {
        return this._children;
    }

    public get parent(): ExpansionTagNode | undefined {
        return this._parent;
    }

    public get attributes(): { [name: string]: string | null; } | undefined {
        return this._attributes;
    }

    /**
     * Constructs the opening tag for the Node by adding its existing
     * attributes to the tag as expected, with attributes ordered according
     * to thee original Node's attribute order.
     * 
     * @returns the string representation of the opening tag of this node
     */
    public toString(): string {
        if (!this._attributes) {
            return `<${this._name}>`;
        }
        let tag: string = `<${this._name}`;
        for (const [key, value] of Object.entries(this._attributes)) {
            if (value === null) {
                tag += ` ${key}=`;
            } else {
                tag += ` ${key}="${value}"`;
            }
        }
        tag += '>';
        return tag;
    }
}

export class CustomTagData implements IHTMLDataProvider {
    private _tags: ITagData[] = [];
    private _tagMap: { [tag: string]: ITagData } = {};
    private _globalAttributes: IAttributeData[];
    private _valueSetMap: { [setName: string]: IValueData[] } = {};

    isApplicable(languageId: string): boolean {
        return true;
    }

    constructor(private readonly id: string, customData: HTMLDataV1) {
        this._tags = customData.tags || [];
        this._globalAttributes = customData.globalAttributes || [];

        this._tags.forEach(t => {
            this._tagMap[t.name.toLowerCase()] = t;
        });

        if (customData.valueSets) {
            customData.valueSets.forEach(vs => {
                this._valueSetMap[vs.name] = vs.values;
            });
        }
    }

    getId(): string {
        return this.id;
    }

    provideTags(): ITagData[] {
        return this._tags;
    }

    provideAttributes(tag: string) {
        const attributes: IAttributeData[] = [];
        const processAttribute = (a: IAttributeData) => {
            attributes.push(a);
        };

        const tagEntry = this._tagMap[tag.toLowerCase()];
        if (tagEntry) {
            tagEntry.attributes.forEach(processAttribute);
        }
        this._globalAttributes.forEach(processAttribute);

        return attributes;
    }

    provideValues(tag: string, attribute: string) {
        const values: IValueData[] = [];

        attribute = attribute.toLowerCase();

        const processAttributes = (attributes: IAttributeData[]) => {
            attributes.forEach(a => {
                if (a.name.toLowerCase() === attribute) {
                    if (a.values) {
                        a.values.forEach(v => {
                            values.push(v);
                        });
                    }

                    if (a.valueSet) {
                        if (this._valueSetMap[a.valueSet]) {
                            this._valueSetMap[a.valueSet].forEach(v => {
                                values.push(v);
                            });
                        }
                    }
                }
            });
        };

        const tagEntry = this._tagMap[tag.toLowerCase()];
        if (tagEntry) {
            processAttributes(tagEntry.attributes);
        }
        processAttributes(this._globalAttributes);

        return values;
    }
}