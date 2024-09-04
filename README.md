# screeps-starter-rust

Starter Rust AI for [Screeps: World][screeps], the JavaScript-based MMO game.

This uses the [`screeps-game-api`] bindings from the [rustyscreeps] organization.

[`wasm-pack`] is used for building the Rust code to WebAssembly. This example uses [Rollup] to
bundle the resulting javascript, [Babel] to transpile generated code for compatibility with older
Node.js versions running on the Screeps servers, and the [`screeps-api`] Node.js package to deploy.

Documentation for the Rust version of the game APIs is at https://docs.rs/screeps-game-api/.

Almost all crates on https://crates.io/ are usable (only things which interact with OS
apis are broken).

## Quickstart:

```sh
# Install rustup: https://rustup.rs/

# Install wasm-pack
cargo install wasm-pack

# Install wasm-opt
cargo install wasm-opt

# Install Node.js for build steps - versions 16 through 22 have been tested, any should work
# nvm is recommended but not required to manage the install, follow instructions at:
# Mac/Linux: https://github.com/nvm-sh/nvm
# Windows: https://github.com/coreybutler/nvm-windows

# Installs Node.js at version 20
# (all versions within LTS support should work;
# 20 is recommended due to some observed problems on Windows systems using 22)
nvm install 20
nvm use 20

# Clone the starter
git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust
# note: if you customize the name of the crate, you'll need to update the MODULE_NAME
# variable in the js_src/main.js file and the module import with the updated name, as well
# as the "name" in the package.json

# Install dependencies for JS build
npm install

# Copy the example config, and set up at least one deployment mode.
cp .example-screeps.yaml .screeps.yaml
nano .screeps.yaml

# compile for a configured server but don't upload
npm run deploy -- --server ptr --dryrun

# compile and upload to a configured server
npm run deploy -- --server mmo
```

## Migration to 0.22

Versions of [`screeps-game-api`] at 0.22 or higher are no longer compatible with the
[`cargo-screeps`] tool for building and deployment; the transpile step being handled by [Babel] is
required to transform the generated JS into code that the game servers can load.

To migrate an existing bot to using the new JavaScript translation layer and deploy script:

- Create a `.screeps.yaml` with the relevant settings from your `screeps.toml` file applied to the
  new `.example-screeps.yaml` example file in this repo.
- Add to your `.gitignore`: `.screeps.yaml`, `node_modules`, and `dist`
- Create a `package.json` copied from the one in this repo and make appropriate customizations.
  - Importantly, if you've modified your module name from `screeps-starter-rust` to something else,
    you need to update the `name` field in `package.json` to be your bot's name.
- Install Node.js (from the quickstart steps above), then run `npm install` from within the bot
  directory to install the required packages.
- Copy the `deploy.js` script over to a new `js_tools` directory.
- Add `main.js` to a new `js_src` directory, either moved from your existing `javascript` dir and
  updated, or freshly copied.
  - If updating, you'll need to change:
    - Import formatting, particularly for the wasm module.
    - wasm module initialization has changed, requiring two calls to first compile the module,
      then to initialize the instance of the module.
  - Whether updating or copying fresh, if you've modified your bot name from `screeps-starter-rust`
    you'll need to update the bot package import and `MODULE_NAME` at the beginning of `main.js`
    to be your updated bot name.
- Update your `Cargo.toml` with version `0.22` for `screeps-game-api`
- Run `npm run deploy -- --server ptr --dryrun` to compile for PTR, remove the `--dryrun` to deploy

### Troubleshooting

#### Error: Not Authorized

If you encounter an error like the following:

```
Error: Not Authorized
    at ScreepsAPI.req (PATH_TO_YOUR_BOT/node_modules/screeps-api/dist/ScreepsAPI.js:1212:17)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async ScreepsAPI.auth (PATH_TO_YOUR_BOT/node_modules/screeps-api/dist/ScreepsAPI.js:1162:17)
    at async ScreepsAPI.fromConfig (PATH_TO_YOUR_BOT/node_modules/screeps-api/dist/ScreepsAPI.js:1394:9)
    at async upload (PATH_TO_YOUR_BOT/js_tools/deploy.js:148:17)
    at async run (PATH_TO_YOUR_BOT/js_tools/deploy.js:163:3
```

Then the password in your `.screeps.yaml` file is getting picked up as something aside from a string. Passwords sent to the server must be a string. Wrap it in quotes: `password: "12345"`

#### Error: Unknown module

If you encounter an error like the following:

```
Error: Unknown module 'bot-name-here'
    at Object.requireFn (<runtime>:20897:23)
    at Object.module.exports.loop (main:933:33)
    at __mainLoop:1:52
    at __mainLoop:2:3
    at Object.exports.evalCode (<runtime>:15381:76)
    at Object.exports.run (<runtime>:20865:24)
```

You need to make sure you update your `package.json` `name` field to be your bot name.

#### CompileError: WebAssembly.Module(): Invalid opcode

If you encounter an error like the following:

```
CompileError: WebAssembly.Module(): Compiling wasm function #327:core::unicode::printable::check::h9ddbb57eb721c858 failed: Invalid opcode (enable with --experimental-wasm-se) @+257876
    at Object.module.exports.loop (main:934:35)
    at __mainLoop:1:52
    at __mainLoop:2:3
    at Object.exports.evalCode (<runtime>:15381:76)
    at Object.exports.run (<runtime>:20865:24)
```

You need to update your `Cargo.toml` to include the `--signext-lowering` flag for `wasm-opt`. For example:

```
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O4", "--signext-lowering"]
```

[screeps]: https://screeps.com/
[`wasm-pack`]: https://rustwasm.github.io/wasm-pack/
[Rollup]: https://rollupjs.org/
[Babel]: https://babeljs.io/
[`screeps-api`]: https://github.com/screepers/node-screeps-api
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[rustyscreeps]: https://github.com/rustyscreeps/
