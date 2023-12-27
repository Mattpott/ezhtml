// TAG PARSER STUFF

// EZTag
    // Class that stores 2 Selections and an enumerated type:
        // 1. Selection from start of opening tag to end of opening tag
        // 2. Selection from start of closing tag to end of closing tag
            // This one can be unset if closing tag's position is unknown
    // Should have pseudogetters for the inside Selection, using the 2 fields
    // Initializer should read in the opening tag Selection and, optionally,
        // the closing tag Selection
    // During initialization it should read the Tag Name from the opening
        // tag and set the enumeration to one of the 3 types:
            // 1. Official ~ If the tag is one of the defined, official tags
            // 2. Custom ~ If the tag is one of the user-defined, custom tags
            // 3. Unknown ~ If the tag is neither of the above
    // If the tag is a Void one (no closing tag necessary), then the
        // closing tag's Selection should be set to null rather than undefined
    // Maybe create method isVoid() that returns closing Selection === null

// Forward Tag Iterator
    // Should be initialized with an initial Position
    // Next() [The version with no tree built, so TODO]
        // 1. Get line of initial/current Position 
            // and search past that Position for any 
            // other tags on that line
        // 2. If no tags found on first line, check from the start of 
            // the next line until a new tag is found, 
            // searching X lines at a time
        // 3. When tag is found, craft an EZTag object out of its contents
            // In this case, the closure of that tag could be potentially
            // unset, so may want to find it?
        // 4. If a tag is found at all, check if the tree option is set
            // (this should be on by default). If this is the case,
            // add the EZTag object to its correct location on the tree
        // 5. Return the generated EZTag by setting the Value variable 
    // The Done variable is set when the Position doesn't change 
        // when incrementing the Position by 1 character and validating