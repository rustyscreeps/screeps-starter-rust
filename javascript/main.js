"use strict";

Error.stackTraceLimit = Infinity;

function wasm_initialize() {
    // attempt to load the wasm only if there's enough bucket to do a bunch of work this tick
    if (Game.cpu.bucket < 500) {
        console.log("we are running out of time, pausing compile!" + JSON.stringify(Game.cpu));
        return;
    }
    
    // replace this initialize function on the module
    const wasm_module = require("screeps-starter-rust");
    // replace the export of this function with the module's
    module.exports.loop = wasm_module.loop;
    // run the setup function, which configures logging
    wasm_module.setup();
    // go ahead and run the loop for its first tick
    wasm_module.loop();
}

module.exports.loop = wasm_initialize;
