"use strict";
let wasm_module;

// replace this with the name of your module
const MODULE_NAME = "screeps-starter-rust";

function console_error(...args) {
    console.log(...args);
    Game.notify(args.join(' '));
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

            // delect the module from the cache, so we can reload it
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
        console_error("caught exception:", error);
        if (error.stack) {
            console_error("stack trace:", error.stack);
        }
        console_error("resetting VM next tick.");
        wasm_module = null;
    }
}
