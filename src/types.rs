use js_sys::JsString;
use screeps::HasId;
use wasm_bindgen::prelude::wasm_bindgen;

// The Rust mappings of the JS Types can be extended to modify their functionality.
// Here, we create a custom Creep type we can use when we know what a Creep definitely has an ID.
// Each tick, JS will pass in a list of Creeps which we will convert to this custom type since
// the only way a creep could *not* have an ID is if it was just spawned this tick, and by passing
// in the creeps from JS before our bot code runs, we know that we have not spawned any new creeps yet
#[wasm_bindgen]
extern "C" {
    // By specifying `extends`, wasm_bindgen will implement Deref for the base type,
    // thus anything a screeps::Creep can do, so can our custom type
    #[wasm_bindgen(extends = screeps::Creep)]
    pub type Creep;

    // Define our own id_internal method instead of screeps::Creep::id_internal since we
    // know that Creeps represented by this type always have an ID
    #[wasm_bindgen(method, getter = id)]
    fn id_internal(this: &Creep) -> JsString;
}

// Implement HasId for our custom creep type (instead of MaybeHasId) since this type is used
// for creeps that are known to have an ID.
impl HasId for Creep {
    fn js_raw_id(&self) -> JsString {
        self.id_internal()
    }
}
