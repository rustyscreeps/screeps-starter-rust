# screeps-starter-rust

Starter Rust AI for [Screeps][screeps], the JavaScript-based MMO game.

This uses the [`screeps-game-api`] bindings from the [rustyscreeps] organization.

It's also recommended to use [`cargo-screeps`] for uploading the code.

The documentation is currently a bit sparse. API docs which list functions one
can use are located at https://docs.rs/screeps-game-api/.

Almost all crates on https://crates.io/ are usable (only things which interact with OS
apis are broken).

Quickstart:

```sh
# cli dependencies:
# TEMPORARY - get the bindgen/wasm-pack branch of the cargo-screeps tool, which is not compatible with stdweb
git clone https://github.com/rustyscreeps/cargo-screeps.git
git checkout bindgen
cd cargo-screeps
cargo install --path .
cd ..
# TEMPORARY once bindgen is merged, go back to simply:
cargo install cargo-screeps

# clone:
git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust
# TEMPORARY
git checkout bindgen

# configure for uploading:
cp example-screeps.toml screeps.toml
nano screeps.toml

# build tool:
cargo screeps --help
# compile the module
cargo screeps build
# compile plus deploy to the configured 'upload' mode
cargo screeps upload
```

[screeps]: https://screeps.com/
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[rustyscreeps]: https://github.com/rustyscreeps/
