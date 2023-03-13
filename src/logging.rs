use js_sys::JsString;
use screeps::game;
use web_sys::console;

pub use log::LevelFilter::*;

struct JsLog;
struct JsNotify;

impl log::Log for JsLog {
    fn enabled(&self, _: &log::Metadata<'_>) -> bool {
        true
    }
    fn log(&self, record: &log::Record<'_>) {
        console::log_1(&JsString::from(format!("{}", record.args())));
    }
    fn flush(&self) {}
}
impl log::Log for JsNotify {
    fn enabled(&self, _: &log::Metadata<'_>) -> bool {
        true
    }
    fn log(&self, record: &log::Record<'_>) {
        game::notify(&format!("{}", record.args()), None);
    }
    fn flush(&self) {}
}

pub fn setup_logging(verbosity: log::LevelFilter) {
    fern::Dispatch::new()
        .level(verbosity)
        .format(|out, message, record| {
            out.finish(format_args!(
                "({}) {}: {}",
                record.level(),
                record.target(),
                message
            ))
        })
        .chain(Box::new(JsLog) as Box<dyn log::Log>)
        .chain(
            fern::Dispatch::new()
                .level(log::LevelFilter::Warn)
                .format(|out, message, _record| {
                    let time = game::time();
                    out.finish(format_args!("[{}] {}", time, message))
                })
                .chain(Box::new(JsNotify) as Box<dyn log::Log>),
        )
        .apply()
        .expect("expected setup_logging to only ever be called once per instance");
}
