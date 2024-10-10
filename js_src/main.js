"use strict";
import 'fastestsmallesttextencoderdecoder-encodeinto/EncoderDecoderTogether.min.js';

import * as bot from '../pkg/screeps_starter_rust.js';
// replace this with the name of your module
const MODULE_NAME = "screeps_starter_rust";
const BUCKET_BOOT_THRESHOLD = 1500;

// This provides the function `console.error` that wasm_bindgen sometimes expects to exist,
// especially with type checks in debug mode. An alternative is to have this be `function () {}`
// and let the exception handler log the thrown JS exceptions, but there is some additional
// information that wasm_bindgen only passes here.
//
// There is nothing special about this function and it may also be used by any JS/Rust code as a convenience.
function console_error() {
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

// track whether running wasm loop for each tick completes, to detect errors or aborted execution
let running = false;

function loaded_loop() {
    // need to freshly override the fake console object each tick
    console.error = console_error;
    if (running) {
        // we've had an error on the last tick; skip execution during the current tick, asking to
        // have our IVM immediately destroyed so we get a fresh environment next tick;
        // workaround for https://github.com/rustwasm/wasm-bindgen/issues/3130
        Game.cpu.halt();
    } else {
        try {
            running = true;
            bot.loop();
            // if execution doesn't get to this point for any reason (error or out-of-CPU
            // cancellation), setting to false won't happen which will cause a halt() next tick
            running = false;
        } catch (error) {
            console.log(`caught exception, will halt next tick: ${error}`);
            // not logging stack since we've already logged the stack trace from rust via the panic
            // hook and that one is generally better, but if we need it, uncomment:

            // if (error.stack) {
            //     console.log("js stack:", error.stack);
            // }
        }
    }
}

// cache for each step of the wasm module's initialization
let wasm_bytes, wasm_module, wasm_instance;

module.exports.loop = function() {
    // need to freshly override the fake console object each tick
    console.error = console_error;

    // attempt to load the wasm only if there's lots of bucket
    if (Game.cpu.bucket < BUCKET_BOOT_THRESHOLD) {
        console.log(`startup deferred; ${Game.cpu.bucket} / ${BUCKET_BOOT_THRESHOLD} required bucket`);
        return;
    }

    // run each step of the load process, saving each result so that this can happen over multiple ticks
    if (!wasm_bytes) wasm_bytes = require(MODULE_NAME);
    if (!wasm_module) wasm_module = new WebAssembly.Module(wasm_bytes);
    if (!wasm_instance) wasm_instance = bot.initSync({ module: wasm_module });

    // remove the bytes from the heap and require cache, we don't need 'em anymore
    wasm_bytes = null;
    delete require.cache[MODULE_NAME];
    // replace this function with the post-load loop for next tick
    module.exports.loop = loaded_loop;
    console.log(`loading complete, CPU used: ${Game.cpu.getUsed()}`)
}
