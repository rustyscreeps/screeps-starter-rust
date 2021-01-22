use std::cell::RefCell;
use std::collections::HashMap;

use js_sys::{Array, JsString, Object};
use log::*;
use screeps::{
    prelude::*, Creep, Find, Game, JsObjectId, Part, ResourceType, RoomObjectProperties, Source,
    Structure, StructureController, StructureSpawn, StructureType,
};
use wasm_bindgen::prelude::*;

mod logging;

// add wasm_bindgen to any function you would like to expose for call from js
#[wasm_bindgen]
pub fn setup() {
    logging::setup_logging(logging::Info);
}

// this is one way to persist data between ticks within Rust's memory, as opposed to
// keeping state in memory on game objects - but will be lost on global resets!
thread_local! {
    static CREEP_TARGETS: RefCell<HashMap<String, CreepTarget>> = RefCell::new(HashMap::new());
}

// this enum will represent a creep's lock on a specific target object, storing a js reference to the object id so that we can grab a fresh reference to the object each successive tick, since screeps game objects become 'stale' and shouldn't be used beyond the tick they were fetched
#[derive(Clone)]
enum CreepTarget {
    Upgrade(JsObjectId<StructureController>),
    Harvest(JsObjectId<Source>),
}

// to use a reserved name as a function name, use `js_name`:
#[wasm_bindgen(js_name = loop)]
pub fn game_loop() {
    debug!("loop starting! CPU: {}", Game::cpu().get_used());

    debug!("running spawns");
    // Game::spawns returns a `js_sys::Object`, which is a light reference to an
    // object of any kind which is held on the javascript heap.
    //
    // Object::values returns a `js_sys::Array`, which contains the member spawn objects
    // representing all the spawns you control.
    //
    // They are returned as wasm_bindgen::JsValue references, which we can safely
    // assume are StructureSpawn objects as returned from js without checking first
    let mut additional = 0;
    for spawn in Object::values(&Game::spawns())
        .iter()
        .map(StructureSpawn::from)
    {
        debug!("running spawn {}", String::from(spawn.name()));
        let body = [Part::Move, Part::Move, Part::Carry, Part::Work];

        if spawn.room().unwrap().energy_available() >= body.iter().map(|p| p.cost()).sum() {
            // generate the body part array on the js side which will be used
            let body_array = Array::new();
            for part in body.iter() {
                body_array.push(&JsValue::from(part.clone()));
            }
            // create a unique name, spawn.
            let name_base = Game::time();
            let name = JsString::from(format!("{}-{}", name_base, additional));
            // note that this bot has a fatal flaw; spawning a creep
            // creates Memory.creeps[creep_name] which will build up forever;
            // these memory entries should be prevented (todo doc link on how) or cleaned up
            let res = spawn.spawn_creep(&body_array, &name, None);

            // todo once fixed in branch this should be ReturnCode::Ok instead of this i8 grumble grumble
            if res != 0 {
                warn!("couldn't spawn: {:?}", res);
            } else {
                additional += 1;
            }
        }
    }

    // mutably borrow the creep_targets refcell, which is holding our creep target locks
    // in the wasm heap
    CREEP_TARGETS.with(|creep_targets_refcell| {
        let mut creep_targets = creep_targets_refcell.borrow_mut();
        debug!("running creeps");
        // same type conversion (and type assumption) as the spawn loop
        for creep in Object::values(&Game::creeps()).iter().map(Creep::from) {
            run_creep(&creep, &mut creep_targets);
        }
    });

    info!("done! cpu: {}", Game::cpu().get_used())
}

fn run_creep(creep: &Creep, creep_targets: &mut HashMap<String, CreepTarget>) {
    if creep.spawning() {
        return;
    }
    let name = String::from(creep.name());
    debug!("running creep {}", name);

    let target = creep_targets.remove(&name);
    match target {
        Some(creep_target) => {
            let keep_target = match &creep_target {
                CreepTarget::Upgrade(controller_id) => {
                    if creep.store().get_used_capacity(Some(ResourceType::Energy)) > 0 {
                        match controller_id.resolve() {
                            Some(controller) => {
                                let r = creep.upgrade_controller(&controller);
                                //if r == ReturnCode::NotInRange {
                                if r == -9 {
                                    creep.move_to(&controller, None);
                                    true
                                //} else if r != ReturnCode::Ok {
                                } else if r != 0 {
                                    warn!("couldn't upgrade: {:?}", r);
                                    false
                                } else {
                                    true
                                }
                            }
                            None => false,
                        }
                    } else {
                        false
                    }
                }
                CreepTarget::Harvest(source_id) => {
                    if creep.store().get_free_capacity(Some(ResourceType::Energy)) > 0 {
                        match source_id.resolve() {
                            Some(source) => {
                                if creep.pos().unwrap().is_near_to(&source.pos().unwrap()) {
                                    let r = creep.harvest(&source);
                                    //if r != ReturnCode::Ok {
                                    if r != 0 {
                                        warn!("couldn't harvest: {:?}", r);
                                        false
                                    } else {
                                        true
                                    }
                                } else {
                                    creep.move_to(&source, None);
                                    true
                                }
                            }
                            None => false,
                        }
                    } else {
                        false
                    }
                }
            };

            if keep_target {
                creep_targets.insert(name, creep_target);
            }
        }
        None => {
            // no target, let's find one depending on if we have energy
            let room = creep.room().expect("couldn't resolve creep room");
            if creep.store().get_used_capacity(Some(ResourceType::Energy)) > 0 {
                for structure in room
                    .find(Find::Structures, None)
                    .iter()
                    .map(Structure::from)
                {
                    match structure.structure_type() {
                        StructureType::Controller => {
                            let typed_id: JsObjectId<StructureController> =
                                JsObjectId::from(structure.id());
                            creep_targets.insert(name, CreepTarget::Upgrade(typed_id));
                            break;
                        }
                        // other structures, skip
                        _ => {}
                    }
                }
            } else {
                for source in room
                    .find(Find::SourcesActive, None)
                    .iter()
                    .map(Source::from)
                {
                    let typed_id: JsObjectId<Source> = JsObjectId::from(source.id());
                    creep_targets.insert(name, CreepTarget::Harvest(typed_id));
                    break;
                }
            }
        }
    }
}
