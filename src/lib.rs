use std::cell::RefCell;
use std::collections::{HashMap, hash_map::Entry};

use log::*;
use screeps::{
    find, game, prelude::*, Creep, ObjectId, Part, ResourceType, ReturnCode, RoomObjectProperties,
    Source, StructureController, StructureObject,
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
    Upgrade(ObjectId<StructureController>),
    Harvest(ObjectId<Source>),
}

// to use a reserved name as a function name, use `js_name`:
#[wasm_bindgen(js_name = loop)]
pub fn game_loop() {
    debug!("loop starting! CPU: {}", game::cpu::get_used());
    // mutably borrow the creep_targets refcell, which is holding our creep target locks
    // in the wasm heap
    CREEP_TARGETS.with(|creep_targets_refcell| {
        let mut creep_targets = creep_targets_refcell.borrow_mut();
        debug!("running creeps");
        // same type conversion (and type assumption) as the spawn loop
        for creep in game::creeps().values() {
            run_creep(&creep, &mut creep_targets);
        }
    });

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
    for spawn in game::spawns().values() {
        debug!("running spawn {}", String::from(spawn.name()));

        let body = [Part::Move, Part::Move, Part::Carry, Part::Work];
        if spawn.room().unwrap().energy_available() >= body.iter().map(|p| p.cost()).sum() {
            // create a unique name, spawn.
            let name_base = game::time();
            let name = format!("{}-{}", name_base, additional);
            // note that this bot has a fatal flaw; spawning a creep
            // creates Memory.creeps[creep_name] which will build up forever;
            // these memory entries should be prevented (todo doc link on how) or cleaned up
            let res = spawn.spawn_creep(&body, &name);

            // todo once fixed in branch this should be ReturnCode::Ok instead of this i8 grumble grumble
            if res != ReturnCode::Ok {
                warn!("couldn't spawn: {:?}", res);
            } else {
                additional += 1;
            }
        }
    }

    info!("done! cpu: {}", game::cpu::get_used())
}

fn run_creep(creep: &Creep, creep_targets: &mut HashMap<String, CreepTarget>) {
    if creep.spawning() {
        return;
    }
    let name = creep.name();
    debug!("running creep {}", name);

    let target = creep_targets.entry(name);
    match target {
         Entry::Occupied(entry) => {
            let creep_target = entry.get();
            match creep_target {
                CreepTarget::Upgrade(controller_id) if creep.store().get_used_capacity(Some(ResourceType::Energy)) > 0 => {
                    if let Some(controller) = controller_id.resolve() {
                        let r = creep.upgrade_controller(&controller);
                        if r == ReturnCode::NotInRange {
                            creep.move_to(&controller);
                        } else if r != ReturnCode::Ok {
                            warn!("couldn't upgrade: {:?}", r);
                            entry.remove();
                        }
                    } else {
                        entry.remove();
                    }
                }
                CreepTarget::Harvest(source_id) if creep.store().get_free_capacity(Some(ResourceType::Energy)) > 0 => {
                    if let Some(source) = source_id.resolve() {
                        if creep.pos().is_near_to(source.pos()) {
                            let r = creep.harvest(&source);
                            if r != ReturnCode::Ok {
                                warn!("couldn't harvest: {:?}", r);
                                entry.remove();
                            }
                        } else {
                            creep.move_to(&source);
                        }
                    } else {
                        entry.remove();
                    }
                },
                _ => { entry.remove(); }
            };
        }
        Entry::Vacant(entry) => {
            // no target, let's find one depending on if we have energy
            let room = creep.room().expect("couldn't resolve creep room");
            if creep.store().get_used_capacity(Some(ResourceType::Energy)) > 0 {
                for structure in room.find(find::STRUCTURES, None).iter() {
                    if let StructureObject::StructureController(controller) = structure {
                        entry.insert(CreepTarget::Upgrade(controller.id()));
                        break;
                    }
                }
            } else if let Some(source) = room.find(find::SOURCES_ACTIVE, None).get(0) {
                entry.insert(CreepTarget::Harvest(source.id()));
            }
        }
    }
}
