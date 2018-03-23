# screeps-starter-rust

Starter Rust AI for Screeps, the JavaScript-based MMO game

This uses tooling located at https://github.com/daboross/screeps-in-rust-via-wasm/.
I'd recommend using `cargo-screeps` for uploading the code, but it should compile
fine just using `cargo-web` provided by the `stdweb` project.

The documentation is currently a bit sparse. API docs which list functions one
can use are located at https://docs.rs/screeps-game-api/.

Almost all crates on https://crates.io/ are usable (only things which interact with OS
apis are broken).

[`stdweb`](https://crates.io/crates/stdweb) can be used to embed custom JavaScript
into code.

Quickstart:

```sh
# clone:

git clone https://github.com/daboross/screeps-starter-rust.git
cd screeps-starter-rust
rustup override set nightly

# cli dependencies:

cargo install cargo-screeps
cargo install cargo-web

# configure for uploading:

cp example-screeps.toml screeps.toml
nano screeps.toml

# build tool:

cargo screeps --help
```

[screeps]: https://screeps.com/
