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

# Installs Node.js at version 22
nvm install 22
nvm use 22

# Clone the starter
git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust
# note: if you customize the name of the crate, you'll need to update the MODULE_NAME
# variable in the javascript/main.js file and the module import with the updated name

# Install dependencies for JS build
npm install

# Copy the example config, and set up at least one deployment mode.
cp .example-screeps.yaml .screeps.yaml
nano .screeps.yaml

# compile for a configured server but don't upload
npm run deploy -- --server ptr --dryrun

# compile and deploy to a configured server
npm run deploy -- --server mmo
```

## Migration to 0.22

Versions of [`screeps-game-api`] at 0.22 or higher are no longer compatible with the
[`cargo-screeps`] tool for building and deployment; the transpilation step being handled
by [Babel] is required to generate code that the game servers can load.

To migrate an existing bot to using the new Javascript translation layer and deploy script:

- Create a `.screeps.yaml` with the relevant settings from your `screeps.toml` file applied to the
  new `.example-screeps.yaml` example file in this repo.
- Add to your `.gitignore`: `.screeps.yaml`, `node_modules`, and `dist`
- Create a `package.json` copied from the one in this repo and make appropriate customizations.
- Install the node dependencies from the quickstart steps above, then run `npm install` from within
  the bot directory to install the required packages.
- Copy the `deploy.js` script over to a new `js_tools` directory.
- Add `main.js` to a new `js_src` directory, either moved from your existing `javascript` dir and
  updated,or freshly copied. If updating, you'll need to change:
  - Import formatting, particularly for the wasm module.
  - wasm module initialization has changed, requiring two calls to first compile the module,
    then to initialize the instance of the module.
- Update your `Cargo.toml` with version `0.22` for `screeps-game-api`
- Run `npm run deploy -- --server ptr --dryrun` to compile for PTR, remove the `--dryrun` to deploy

[screeps]: https://screeps.com/
[`wasm-pack`]: https://rustwasm.github.io/wasm-pack/
[Rollup]: https://rollupjs.org/
[Babel]: https://babeljs.io/
[`screeps-api`]: https://github.com/screepers/node-screeps-api
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[rustyscreeps]: https://github.com/rustyscreeps/
