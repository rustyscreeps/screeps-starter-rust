const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const { rollup } = require('rollup');
const babel = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const copy = require('rollup-plugin-copy');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');

const { ScreepsAPI } = require('screeps-api');
const yaml = require('yamljs');
const argv = require('yargs')
  .option('server', {
    describe: 'server to connect to; must be defined in .screeps.yaml servers section',
  })
  .demandOption('server')
  .option('dryrun', {
    describe: 'execute a dry run, skipping the upload of the generated code',
    type: 'boolean',
    default: false,
  })
  .argv;

function load_config() {
  const yaml_conf = yaml.parse(fs.readFileSync('.screeps.yaml', { encoding: 'utf8' }));

  const branch = yaml_conf.servers[argv.server].branch || 'default';
  let use_terser = false;
  let extra_options = [];

  const configs = yaml_conf.configs || {};

  const terser_configs = configs.terser || {};
  if (terser_configs['*'] !== undefined) {
    use_terser = terser_configs['*'];
  }
  if (terser_configs[argv.server] !== undefined) {
    use_terser = terser_configs[argv.server];
  }

  const wasm_pack_options = configs['wasm-pack-options'] || {};
  if (wasm_pack_options['*']) {
    extra_options = extra_options.concat(wasm_pack_options['*'])
  }
  if (wasm_pack_options[argv.server]) {
    extra_options = extra_options.concat(wasm_pack_options[argv.server])
  }

  return {
    branch: branch,
    use_terser: use_terser,
    extra_options: extra_options,
  }
}

function output_clean() {
  for (dir of ['dist', 'pkg']) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  }
}

function run_wasm_pack(extra_options) {
  let args = ['run', 'nightly', 'wasm-pack', 'build', '--target', 'web', '--release', '.', ...extra_options];
  spawnSync('rustup', args, { stdio: 'inherit' })
}

async function run_rollup(use_terser) {
  const bundle = await rollup({
    input: 'js_src/main.js',
    plugins: [
      commonjs(),
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env'],
        targets: {
          "node": 12,
        }
      }),
      copy({
        // todo, should figure out a better way to get the name
        targets: [{ src: 'pkg/screeps_starter_rust_bg.wasm', dest: 'dist', rename: 'screeps_starter_rust.wasm' }]
      }),
    ]
  });
  await bundle.write({
    format: 'cjs',
    file: 'dist/main.js',
    plugins: [use_terser && terser()],
  });
}

async function upload(server, branch, dryrun) {
  let modules = {};
  let used_bytes = 0;

  await fs.readdirSync('dist').map(function (filename) {
    if (filename.endsWith('.wasm')) {
      const data = fs.readFileSync(path.join('dist', filename), {encoding: 'base64'});
      const filename_stripped = filename.replace(/\.wasm$/, '');
      used_bytes += data.length;
      modules[filename_stripped] = {
        binary: data,
      }
    } else {
      const data = fs.readFileSync(path.join('dist', filename), {encoding: 'utf8'});
      const filename_stripped = filename.replace(/\.js$/, '');
      used_bytes += data.length;
      modules[filename_stripped] = data;
    }
  });

  const used_mib = used_bytes / (1024 * 1024);
  const used_percent = 100 * used_mib / 5;

  const usage_string = `${used_mib.toFixed(2)} MiB of 5.0 MiB code size limit (${used_percent.toFixed(2)}%)`
  if (dryrun) {
    console.log(`Not uploading due to --dryrun; would use ${usage_string}`);
  } else {
    console.log(`Uploading; using ${usage_string}`);
    const api = await ScreepsAPI.fromConfig(server);
    const response = await api.code.set(branch, modules);
    console.log(JSON.stringify(response));
  }
}

async function run() {
  const config = load_config();

  // clean output (pkg/dist dirs)
  output_clean();
  
  // run cargo build
  run_wasm_pack(config.extra_options);

  // run rollup
  await run_rollup(config.use_terser);

  // read resulting files and upload
  await upload(argv.server, config.branch, argv.dryrun);
}

run().catch(console.error)
