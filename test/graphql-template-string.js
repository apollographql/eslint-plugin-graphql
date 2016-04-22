/**
 * @fileoverview rule
 * @author Sashko Stubailo
 * @copyright 2016 Sashko Stubailo. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
"use strict";

console.log('waht');

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../graphql-template-string"),

    RuleTester = require("eslint").RuleTester;


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("graphql-template-string", rule, {

    valid: [

        // give me some code that won't trigger a warning
    ],

    invalid: [
        {
            parserOptions: {
              "ecmaVersion": 6,
              "sourceType": "module"
            },
            code: "const x = `{ nonExistentQuery }`",
            errors: [{
                message: "Fill me in.",
                type: "Me too"
            }]
        }
    ]
});
