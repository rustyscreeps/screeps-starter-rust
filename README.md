# screeps-starter-rust

Starter Rust AI for [Screeps: World][screeps], the JavaScript-based MMO game.

This uses the [`screeps-game-api`] bindings from the [rustyscreeps] organization.

While it's possible to compile using [`wasm-pack`] directly using the Node.js target,
some modifications are needed to load the output within the Screep environment, so it's
recommended to use [`cargo-screeps`] for building and deploying your code.

The documentation is currently a bit sparse. API docs which list functions one
can use are located at https://docs.rs/screeps-game-api/.

Almost all crates on https://crates.io/ are usable (only things which interact with OS
apis are broken).

Quickstart:

```sh
# Install rustup: https://rustup.rs/

# Install wasm-pack
cargo install wasm-pack

# Install wasm-opt
cargo install wasm-opt

# Install nvm: https://github.com/nvm-sh/nvm
# (Windows: https://github.com/coreybutler/nvm-windows)

# Install node at version 20 (16 to 21 tested ok, IIRC)
nvm install 20
nvm use 20

# Clone the starter
git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust
# note: if you customize the name of the crate, you'll need to update the MODULE_NAME
# variable in the javascript/main.js file with the updated name

# Install node deps
npm install

# Copy the example config, and set up at least one deployment mode.
# Configure credentials if you'd like to upload directly, or a directory to copy to
# if you'd prefer to use the game client to deploy:
cp .example-screeps.yaml .screeps.yaml
nano .screeps.yaml

# compile for a configured server but don't upload
npm run deploy -- --server ptr --dryrun

# compile and deploy to a configured server
npm run deploy -- --server mmo
```

[screeps]: https://screeps.com/
[`wasm-pack`]: https://rustwasm.github.io/wasm-pack/
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[rustyscreeps]: https://github.com/rustyscreeps/
