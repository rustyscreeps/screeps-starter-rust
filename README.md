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
# Install CLI dependency:
cargo install cargo-screeps

# Clone the starter
git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust

# Copy the example config, and set up at least one deployment mode
cp example-screeps.toml screeps.toml
nano screeps.toml
# configure credentials (API key) if you'd like to upload directly,
# or a directory to copy to if you'd prepfer to use the game client to deploy

# build tool:
cargo screeps --help
# compile the module without deploying anywhere
cargo screeps build
# compile plus deploy to the configured 'upload' mode; any section name you
# set up in your screeps.toml for different environments and servers can be used
cargo screeps deploy -m upload
# or if you've set a default mode in your configuration, simply use:
cargo screeps deploy
```

[screeps]: https://screeps.com/
[`wasm-pack`]: https://rustwasm.github.io/wasm-pack/
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[rustyscreeps]: https://github.com/rustyscreeps/
