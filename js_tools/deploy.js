const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');

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

const package_name_underscore = process.env.npm_package_name.replace(/\-/g, "_");

// load configuration from .screeps.yaml
// unified config format:
// https://github.com/screepers/screepers-standards/blob/master/SS3-Unified_Credentials_File.md
function load_config() {
  const yaml_conf = yaml.parse(fs.readFileSync('.screeps.yaml', { encoding: 'utf8' }));
  const configs = yaml_conf.configs || {};

  if (!yaml_conf.servers[argv.server]) {
    console.log(`no configuration found for server ${argv.server} in .screeps.yaml`);
    return
  }

  const branch = yaml_conf.servers[argv.server].branch || 'default';

  // whether the terser minification step should be called during rollup
  // read the default from the '*' key first (if it exists) then override
  // with server config (if it exists)
  let use_terser = false;
  const terser_configs = configs.terser || {};
  if (terser_configs['*'] !== undefined) {
    use_terser = terser_configs['*'];
  }
  if (terser_configs[argv.server] !== undefined) {
    use_terser = terser_configs[argv.server];
  }

  // extra options to pass to wasm-pack - append the options from the '*'
  // key then any server-specific options
  let extra_options = [];
  const wasm_pack_options = configs['wasm-pack-options'] || {};
  if (wasm_pack_options['*']) {
    extra_options = extra_options.concat(wasm_pack_options['*'])
  }
  if (wasm_pack_options[argv.server]) {
    extra_options = extra_options.concat(wasm_pack_options[argv.server])
  }

  return { branch, use_terser, extra_options }
}

// clear the dist and pkg directories of any existing build results
async function output_clean() {
  for (dir of ['dist', 'pkg']) {
    await fsExtra.emptyDir(dir);
  }
}

// invoke wasm-pack, compiling the wasm module into the pkg directory
function run_wasm_pack(extra_options) {
  let args = ['build', '--target', 'web', '--release', '.', ...extra_options];
  return spawnSync('wasm-pack', args, { stdio: 'inherit' })
}

// run the rollup bundler on the main.js file, outputting the results to the dist directory
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
        },
      }),
      copy({
        targets: [{
          src: `pkg/${package_name_underscore}_bg.wasm`,
          dest: 'dist',
          rename: `${package_name_underscore}.wasm`,
        }]
      }),
    ]
  });
  await bundle.write({
    format: 'cjs',
    file: 'dist/main.js',
    plugins: [use_terser && terser()],
  });
}

// load the built code from the dist directory and craft it into the format the API needs
function load_built_code() {
  let modules = {};
  // track how much space our code uses, since that's limited to 5 MiB
  let used_bytes = 0;

  fs.readdirSync('dist').map(filename => {
    if (filename.endsWith('.wasm')) {
      const data = fs.readFileSync(path.join('dist', filename), { encoding: 'base64' });
      const filename_stripped = filename.replace(/\.wasm$/, '');
      used_bytes += data.length;
      modules[filename_stripped] = {
        binary: data,
      }
    } else {
      const data = fs.readFileSync(path.join('dist', filename), { encoding: 'utf8' });
      const filename_stripped = filename.replace(/\.js$/, '');
      used_bytes += data.length;
      modules[filename_stripped] = data;
    }
  });

  const used_mib = used_bytes / (1024 * 1024);
  const used_percent = 100 * used_mib / 5;

  return { used_mib, used_percent, modules }
}

// upload the code to the servers using the API (or simulate it without uploading, if
// dryrun is true)
async function upload(code, server, branch, dryrun) {
  const usage_string = `${code.used_mib.toFixed(2)} MiB of 5.0 MiB code size limit (${code.used_percent.toFixed(2)}%)`
  if (dryrun) {
    console.log(`Not uploading due to --dryrun; would use ${usage_string}`);
  } else {
    console.log(`Uploading to branch ${branch}; using ${usage_string}`);
    const api = await ScreepsAPI.fromConfig(server);
    const response = await api.code.set(branch, code.modules);
    console.log(JSON.stringify(response));
  }
}

async function run() {
  const config = load_config();
  if (!config) {
    return
  }
  await output_clean();
  const build_result = await run_wasm_pack(config.extra_options);
  if (build_result.status !== 0) {
    return
  }
  await run_rollup(config.use_terser);
  const code = load_built_code();
  await upload(code, argv.server, config.branch, argv.dryrun);
}

run().catch(console.error)
