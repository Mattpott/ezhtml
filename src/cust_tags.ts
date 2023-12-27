import * as vscode from 'vscode';

// JSON DATA STORAGE

// https://code.visualstudio.com/api/extension-guides/virtual-documents
// https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider

// On startup load up the saved custom tags JSON containing a map of tags
    // The keys for the map should be the custom tag content name
    // Stored JSON data should store the following data:
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


// ACTUALLY EXPANDING THE TAG

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

