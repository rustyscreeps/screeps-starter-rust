# screeps-starter-rust

Starter Rust AI for [Screeps][screeps], the JavaScript-based MMO game.

This uses the [`screeps-game-api`] bindings from the [rustyscreeps] organization.

It's also recommended to use [`cargo-screeps`] for uploading the code, but the code should still
compile if using [`cargo-web`] directly instead.

The documentation is currently a bit sparse. API docs which list functions one
can use are located at https://docs.rs/screeps-game-api/.

Almost all crates on https://crates.io/ are usable (only things which interact with OS
apis are broken).

[`stdweb`](https://crates.io/crates/stdweb) can be used to embed custom JavaScript
into code.

Quickstart:

```sh
# clone:

git clone https://github.com/rustyscreeps/screeps-starter-rust.git
cd screeps-starter-rust

# cli dependencies:

cargo install cargo-screeps

# configure for uploading:

cp example-screeps.toml screeps.toml
nano screeps.toml

# build tool:

cargo screeps --help
```

[screeps]: https://screeps.com/
[`stdweb`]: https://github.com/koute/stdweb
[`cargo-web`]: https://github.com/koute/cargo-web
[`cargo-screeps`]: https://github.com/rustyscreeps/cargo-screeps/
[`screeps-game-api`]: https://github.com/rustyscreeps/screeps-game-api/
[rustyscreeps]: https://github.com/rustyscreeps/
