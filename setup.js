#!/usr/bin/env node
'use strict';
/*
 * Basekit setup. Works on macOS, Linux and Windows. Needs Node 18+ and the
 * Claude Code CLI on PATH.
 *
 *   node setup.js              interactive: shows each step and asks first
 *   node setup.js --yes        accept every step
 *   node setup.js --dry-run    print what would happen, change nothing
 *   node setup.js --no-plugins skip installing the core plugins
 *   node setup.js --no-rules   skip the house-rules block in the user CLAUDE.md
 *   node setup.js --uninstall  remove Basekit and its rules block
 *
 * What it does, in order:
 *   1. validates this kit with `claude plugin validate`
 *   2. registers this folder as a local marketplace and installs the basekit plugin
 *   3. installs the "core" plugins from registry.json, each from the vetted source
 *   4. writes the house-rules block into your user CLAUDE.md, between markers
 * It never pipes anything to a shell and installs only through `claude plugin`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const KIT = __dirname;
const PLUGIN_DIR = path.join(KIT, 'plugins', 'basekit');
const MARKETPLACE = require(path.join(KIT, '.claude-plugin', 'marketplace.json')).name;
const PLUGIN = require(path.join(PLUGIN_DIR, '.claude-plugin', 'plugin.json')).name;
const REGISTRY = require(path.join(PLUGIN_DIR, 'registry.json'));
const RULES_START = '<!-- basekit:start (managed by setup.js; edits inside are overwritten) -->';
const RULES_END = '<!-- basekit:end -->';
const MIN_NODE_MAJOR = 18; // hardcoded: oldest Node line the scripts' syntax and APIs were written for

const flags = new Set(process.argv.slice(2));
const YES = flags.has('--yes');
const DRY = flags.has('--dry-run');

const log = (s = '') => console.log(s);

function claude(args, { capture = false } = {}) {
  // hardcoded: ceiling for the plugin catalogue JSON (about 2 MB today)
  const opts = { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: capture ? 'pipe' : 'inherit' };
  let r = spawnSync('claude', args, opts);
  if (r.error && r.error.code === 'ENOENT' && process.platform === 'win32') {
    r = spawnSync('claude', args, { ...opts, shell: true }); // npm installs a .cmd shim
  }
  return r;
}

function run(args) {
  log(`  $ claude ${args.join(' ')}`);
  if (DRY) return true;
  const r = claude(args);
  return !r.error && r.status === 0;
}

async function confirm(question) {
  if (YES || DRY) return true;
  if (!process.stdin.isTTY) {
    log(`  (not interactive: skipped. Re-run with --yes to accept.)`);
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(`${question} [y/N] `, resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function inventory() {
  const r = claude(['plugin', 'list', '--json', '--available'], { capture: true });
  const start = (r.stdout || '').indexOf('{');
  if (r.error || r.status !== 0 || start < 0) return { installed: [], available: [] };
  try {
    const d = JSON.parse(r.stdout.slice(start));
    return { installed: d.installed || [], available: d.available || [] };
  } catch {
    return { installed: [], available: [] };
  }
}

/**
 * Pick the marketplace entry for a registry entry. The plugin name alone is not
 * enough: different marketplaces can list different repositories under one
 * name, so the entry's source must match the repository that was vetted.
 */
function resolve(entry, available) {
  const want = String(entry.repo || '').replace(/^github\.com\//, '').toLowerCase();
  const anthropicLocal = (p) => typeof p.source === 'string' && p.marketplaceName === 'claude-plugins-official';
  const matches = available.filter(
    (p) =>
      p.name.toLowerCase() === entry.name.toLowerCase() &&
      (JSON.stringify(p.source || '').toLowerCase().includes(want) || (want.startsWith('anthropics/') && anthropicLocal(p)))
  );
  const order = entry.marketplace ? [entry.marketplace] : REGISTRY.marketplacePreference || [];
  matches.sort((a, b) => rank(order, a.marketplaceName) - rank(order, b.marketplaceName));
  return matches[0] || null;
}
const rank = (order, name) => (order.indexOf(name) === -1 ? 999 : order.indexOf(name));

function userClaudeMd() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'CLAUDE.md');
}

function rulesBlock() {
  const body = fs.readFileSync(path.join(PLUGIN_DIR, 'user-rules.md'), 'utf8').trim();
  return `${RULES_START}\n${body}\n${RULES_END}`;
}

function writeRules(remove = false) {
  const file = userClaudeMd();
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const i = current.indexOf(RULES_START);
  const j = current.indexOf(RULES_END);
  let next;
  if (i !== -1 && j > i) {
    next = current.slice(0, i) + (remove ? '' : rulesBlock()) + current.slice(j + RULES_END.length);
  } else if (remove) {
    return 'no Basekit block found';
  } else {
    next = `${current.replace(/\s*$/, '')}${current.trim() ? '\n\n' : ''}${rulesBlock()}\n`;
  }
  next = next.replace(/\n{3,}/g, '\n\n');
  if (next === current) return 'already up to date';
  if (DRY) return `would update ${file}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const backup = `${file}.basekit-backup`;
  if (current && !fs.existsSync(backup)) fs.writeFileSync(backup, current);
  fs.writeFileSync(file, next);
  return `${remove ? 'removed block from' : 'updated'} ${file}`;
}

async function uninstall() {
  log('Removing Basekit');
  run(['plugin', 'uninstall', `${PLUGIN}@${MARKETPLACE}`]);
  run(['plugin', 'marketplace', 'remove', MARKETPLACE]);
  log(`  rules: ${writeRules(true)}`);
  log('\nPlugins that setup installed from other marketplaces were left in place.');
  log('Remove them with `claude plugin uninstall <name>@<marketplace>` if you want.');
}

async function main() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE_MAJOR) {
    console.error(`Basekit needs Node ${MIN_NODE_MAJOR} or later; this is ${process.versions.node}.`);
    process.exit(1);
  }
  const version = claude(['--version'], { capture: true });
  if (version.error || version.status !== 0) {
    console.error('The `claude` command was not found. Install Claude Code first, then run this again.');
    process.exit(1);
  }
  log(`Claude Code ${String(version.stdout).trim()}, Node ${process.versions.node}${DRY ? '  (dry run)' : ''}`);

  if (flags.has('--uninstall')) return uninstall();

  log('\n1. Validate the kit');
  if (!run(['plugin', 'validate', KIT]) || !run(['plugin', 'validate', PLUGIN_DIR])) {
    console.error('Validation failed. Nothing was installed.');
    process.exit(1);
  }

  log('\n2. Register this folder as a marketplace and install Basekit');
  const before = inventory(); // read-only, so it also runs in a dry run
  const haveMarket =
    before.available.some((p) => p.marketplaceName === MARKETPLACE) ||
    before.installed.some((p) => String(p.id).endsWith(`@${MARKETPLACE}`));
  if (haveMarket) run(['plugin', 'marketplace', 'update', MARKETPLACE]);
  else if (!run(['plugin', 'marketplace', 'add', KIT])) {
    console.error('Could not add the marketplace.');
    process.exit(1);
  }
  if (before.installed.some((p) => p.id === `${PLUGIN}@${MARKETPLACE}`)) {
    log('  basekit is already installed (it loads from this folder, so edits here apply after /reload-plugins).');
  } else if (!run(['plugin', 'install', `${PLUGIN}@${MARKETPLACE}`, '--scope', 'user'])) {
    console.error('Could not install the basekit plugin.');
    process.exit(1);
  }

  if (!flags.has('--no-plugins')) {
    log('\n3. Core plugins from the vetted registry');
    const inv = DRY ? before : inventory();
    const installedNames = new Set(inv.installed.map((p) => String(p.id).split('@')[0].toLowerCase()));
    const core = REGISTRY.entries.filter((e) => e.tier === 'core' && e.kind === 'plugin');
    const plan = [];
    for (const e of core) {
      if (installedNames.has(e.name.toLowerCase())) {
        log(`  ${e.name}: already installed`);
        continue;
      }
      const hit = resolve(e, inv.available);
      if (!hit) {
        log(`  ${e.name}: not found from ${e.repo} in your marketplaces. Skipped.`);
        log(`     In a Claude Code session try: /plugin marketplace add anthropics/claude-plugins-official`);
        continue;
      }
      plan.push({ e, id: hit.pluginId });
    }
    for (const { e, id } of plan) {
      log(`\n  ${id}`);
      log(`     Why: ${e.why}`);
      log(`     Note: ${e.notes}`);
      if (await confirm(`     Install ${id}?`)) {
        if (!run(['plugin', 'install', id, '--scope', 'user'])) log(`     Install failed; continue without it.`);
      }
    }
    if (!plan.length) log('  Nothing to install.');
  }

  if (!flags.has('--no-rules')) {
    log('\n4. House rules in your user CLAUDE.md');
    log(`  Adds a ${rulesBlock().split('\n').length}-line block between markers in ${userClaudeMd()}.`);
    log('  It loads in every session in every project. Your own content is left alone;');
    log('  a one-time backup is written next to the file.');
    if (await confirm('  Write the block?')) log(`  ${writeRules(false)}`);
  }

  log('\nDone. Next:');
  log('  - Start a new Claude Code session. The toolkit check runs at most once a day.');
  log('  - In a project: /basekit:init');
  log('  - Before a commit: /basekit:review');
  log('  - Anytime: /basekit:status   Monthly, or when the check suggests it: /basekit:scout');
  log('  - Optional tools and the reasoning behind every verdict: docs/VETTING.md');
}

main().catch((err) => {
  console.error(`Setup failed: ${err.message}`);
  process.exit(1);
});
