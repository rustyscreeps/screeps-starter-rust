"use strict";
let wasm_module;

// replace this with the name of your module
const MODULE_NAME = "screeps-starter-rust";

// This provides the function `console.error` that wasm_bindgen sometimes expects to exist,
// especially with type checks in debug mode. An alternative is to have this be `function () {}`
// and let the exception handler log the thrown JS exceptions, but there is some additional
// information that wasm_bindgen only passes here.
//
// There is nothing special about this function and it may also be used by any JS/Rust code as a convenience.
console.error = function () {
    const processedArgs = _.map(arguments, (arg) => {
        if (arg instanceof Error) {
            // On this version of Node, the `stack` property of errors contains
            // the message as well.
            return arg.stack;
        } else {
            return arg;
        }
    }).join(' ');
    console.log("ERROR:", processedArgs);
    Game.notify(processedArgs);
}

module.exports.loop = function () {
    try {
        if (wasm_module) {
            wasm_module.loop();
        } else {
            // attempt to load the wasm only if there's enough bucket to do a bunch of work this tick
            if (Game.cpu.bucket < 500) {
                console.log("we are running out of time, pausing compile!" + JSON.stringify(Game.cpu));
                return;
            }

            // delete the module from the cache, so we can reload it
            if (MODULE_NAME in require.cache) {
                delete require.cache[MODULE_NAME];
            }
            // load the wasm module
            wasm_module = require(MODULE_NAME);
            // load the wasm instance!
            wasm_module.initialize_instance();
            // run the setup function, which configures logging
            wasm_module.setup();
            // go ahead and run the loop for its first tick
            wasm_module.loop();
        }
    } catch (error) {
        console.error("caught exception:", error);
        // we've already logged the more-descriptive stack trace from rust's panic_hook
        // if for some reason (like wasm init problems) you're not getting output from that
        // and need more information, uncomment the following:
        // if (error.stack) {
        //     console.error("stack trace:", error.stack);
        // }
        console.error("resetting VM next tick.");
        wasm_module = null;
    }
}
