#!/usr/bin/env node
'use strict';
/*
 * Basekit toolkit scan.
 *
 * As a SessionStart hook: at most once per scan_interval_hours it compares the
 * plugins Claude Code reports (`claude plugin list --json --available`) with
 * registry.json and prints a short summary. Inside the interval it prints
 * nothing, so it adds no tokens. It never installs, updates or removes anything
 * and makes no network request of its own.
 *
 * By hand or from /basekit-guard:status:
 *   node session-scan.js --force --verbose
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const c = require('./lib/common');

const argv = new Set(process.argv.slice(2));
const FORCE = argv.has('--force');
const VERBOSE = argv.has('--verbose');

// Areas this kit cares about, used to rank newly listed plugins.
const AREA_PATTERN =
  /\b(ui|ux|design|frontend|front-end|component|css|tailwind|backend|api|database|sql|review|security|secret|vulnerab|lint|test|token|context|memory|refactor|debug)\b/i;

function runClaude(args) {
  const opts = {
    encoding: 'utf8',
    timeout: c.setting('scan_timeout_ms'),
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024, // hardcoded: ceiling for the plugin catalogue JSON (about 2 MB today)
    env: { ...process.env, BASEKIT_SCANNING: '1' },
  };
  let r = spawnSync('claude', args, opts);
  if (r.error && r.error.code === 'ENOENT' && process.platform === 'win32') {
    // npm-installed Claude Code is a .cmd shim, which needs a shell on Windows.
    r = spawnSync('claude', args, { ...opts, shell: true });
  }
  return r;
}

function inventory() {
  const r = runClaude(['plugin', 'list', '--json', '--available']);
  if (r.error) return { error: `could not run claude: ${r.error.code || r.error.message}` };
  if (r.status !== 0) return { error: `claude plugin list exited ${r.status}` };
  const start = (r.stdout || '').indexOf('{');
  if (start < 0) return { error: 'claude plugin list printed no JSON' };
  try {
    const parsed = JSON.parse(r.stdout.slice(start));
    return { installed: parsed.installed || [], available: parsed.available || [] };
  } catch (e) {
    return { error: `could not parse plugin list: ${e.message}` };
  }
}

// Suffixes Claude Code uses for plugins that did not come from a marketplace:
// synced from the claude.ai account, loaded with --plugin-dir, or found in a skills folder.
const NOT_A_MARKETPLACE = new Set(['synced', 'inline', 'skills-dir']);

// This kit's own two plugins are not third-party tools to vet.
const OWN_PLUGINS = new Set([c.setting('core_plugin'), require(path.join(c.PLUGIN_ROOT, '.claude-plugin', 'plugin.json')).name]);

const nameOf = (id) => String(id).split('@')[0].toLowerCase();
const marketOf = (id) => String(id).split('@')[1] || '';

function onPath(bin) {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      try {
        if (dir && fs.statSync(path.join(dir, bin + ext)).isFile()) return true;
      } catch {
        /* not here */
      }
    }
  }
  return false;
}

function analyse(inv, registry, state) {
  const plugins = registry.entries.filter((e) => e.kind === 'plugin');
  const byName = new Map(plugins.map((e) => [e.name.toLowerCase(), e]));
  const installed = inv.installed.filter((p) => p.scope !== 'session');
  const installedByName = new Map(installed.map((p) => [nameOf(p.id), p]));

  const missingCore = plugins
    .filter((e) => e.tier === 'core' && !installedByName.has(e.name.toLowerCase()))
    .map((e) => e.name);

  const flagged = installed
    .filter((p) => ['caution', 'avoid'].includes((byName.get(nameOf(p.id)) || {}).tier))
    .map((p) => `${p.id} (${byName.get(nameOf(p.id)).tier})`);

  const unvetted = installed
    .filter((p) => !byName.has(nameOf(p.id)) && !OWN_PLUGINS.has(nameOf(p.id)))
    .map((p) => p.id);

  // A vetted name installed from a marketplace other than the vetted one may be
  // a different plugin: names are not unique across marketplaces.
  const expectedMarkets = (e) => (e.marketplace ? [e.marketplace] : registry.marketplacePreference || []);
  const wrongSource = installed
    .filter((p) => {
      const e = byName.get(nameOf(p.id));
      if (!e || NOT_A_MARKETPLACE.has(marketOf(p.id))) return false;
      return expectedMarkets(e).length > 0 && !expectedMarkets(e).includes(marketOf(p.id));
    })
    .map((p) => p.id);

  const firstRun = !Array.isArray(state.seen);
  const seen = new Set(state.seen || []);
  const fresh = firstRun ? [] : inv.available.filter((p) => !seen.has(p.pluginId));
  const relevant = fresh.filter((p) => AREA_PATTERN.test(`${p.name} ${p.description || ''}`));

  const knownAlwaysOn = installed.reduce((sum, p) => {
    const e = byName.get(nameOf(p.id));
    return sum + (p.enabled !== false && e && Number.isFinite(e.alwaysOnTokens) ? e.alwaysOnTokens : 0);
  }, 0);

  return {
    plugins,
    installed,
    installedByName,
    missingCore,
    flagged,
    unvetted,
    wrongSource,
    firstRun,
    freshCount: fresh.length,
    relevant,
    registryAgeDays: c.daysSince(registry.reviewed),
    knownAlwaysOn,
    allIds: inv.installed.map((p) => p.id).concat(inv.available.map((p) => p.pluginId)),
  };
}

function summarise(a) {
  const cap = c.setting('scan_max_listed');
  const list = (items) => items.slice(0, cap).join(', ') + (items.length > cap ? ` and ${items.length - cap} more` : '');
  const parts = [];
  if (a.missingCore.length) parts.push(`Core plugins not installed: ${list(a.missingCore)}.`);
  if (a.wrongSource.length) parts.push(`Installed from a marketplace other than the vetted one: ${list(a.wrongSource)}.`);
  if (a.flagged.length) parts.push(`Installed with a caution or avoid verdict: ${list(a.flagged)}.`);
  if (a.unvetted.length) parts.push(`Installed but not in the vetted registry: ${list(a.unvetted)}.`);
  if (a.relevant.length) {
    parts.push(
      `${a.freshCount} plugins are new in the configured marketplaces since the last check; ` +
        `${a.relevant.length} match this kit's areas: ${list(a.relevant.map((p) => p.pluginId))}.`
    );
  }
  const stale = c.setting('scout_stale_days');
  if (a.registryAgeDays !== null && a.registryAgeDays > stale) {
    parts.push(`The vetted registry was last reviewed ${a.registryAgeDays} days ago.`);
  }
  if (!parts.length) return '';
  return (
    `Basekit toolkit check: ${parts.join(' ')} ` +
    'Nothing was installed or changed. /basekit-guard:status shows the full table; /basekit-guard:scout vets new candidates.'
  );
}

function verboseReport(a, registry, inv) {
  const out = [];
  out.push(`Basekit status  (registry reviewed ${registry.reviewed}, ${a.registryAgeDays} days ago)`);
  out.push('');
  out.push('Vetted plugins');
  for (const e of a.plugins) {
    const p = a.installedByName.get(e.name.toLowerCase());
    const st = p ? (p.enabled === false ? 'disabled ' : 'installed') : '-        ';
    const tok = Number.isFinite(e.alwaysOnTokens) ? `~${e.alwaysOnTokens} tok` : 'not measured';
    out.push(`  ${st}  ${e.tier.padEnd(8)}  ${e.name.padEnd(20)}  ${tok}${p ? `  (${p.id})` : ''}`);
  }
  out.push('');
  out.push('Vetted command-line tools and skills');
  for (const e of registry.entries.filter((x) => x.kind !== 'plugin')) {
    const bin = { 'playwright-cli': 'playwright-cli', gitleaks: 'gitleaks', graphify: 'graphify', rtk: 'rtk', headroom: 'headroom', omniroute: 'omniroute' }[e.name];
    const st = bin ? (onPath(bin) ? 'on PATH  ' : '-        ') : 'n/a      ';
    out.push(`  ${st}  ${e.tier.padEnd(8)}  ${e.name}`);
  }
  out.push('');
  out.push(`Always-on tokens from installed, enabled, measured plugins: ~${a.knownAlwaysOn}`);
  out.push('  (Basekit itself is not in that figure: run `claude plugin details basekit` and `claude plugin details basekit-guard`.)');
  out.push(`Core missing: ${a.missingCore.join(', ') || 'none'}`);
  out.push(`Unexpected marketplace: ${a.wrongSource.join(', ') || 'none'}`);
  out.push(`Caution/avoid installed: ${a.flagged.join(', ') || 'none'}`);
  out.push(`Not in registry: ${a.unvetted.join(', ') || 'none'}`);
  out.push(
    a.firstRun
      ? `New in marketplaces: first check, ${inv.available.length} available plugins recorded as the baseline`
      : `New in marketplaces since last check: ${a.freshCount} (${a.relevant.length} in this kit's areas)`
  );
  for (const p of a.relevant.slice(0, 25)) {
    out.push(`  ${p.pluginId}  -  ${(p.description || '').slice(0, 90)}`);
  }
  return out.join('\n');
}

function main() {
  if (process.env.BASEKIT_SCANNING) process.exit(0); // never recurse through our own claude call
  if (!FORCE && !VERBOSE) c.readHookInput(); // drain the hook's stdin; the scan does not depend on its content

  const stateFile = path.join(c.dataDir(), 'scan-state.json');
  const state = c.readJson(stateFile, {});
  const intervalMs = c.setting('scan_interval_hours') * 3600000;
  const due = FORCE || !state.lastScan || Date.now() - Date.parse(state.lastScan) >= intervalMs;
  if (!due) process.exit(0);

  const inv = inventory();
  if (inv.error) {
    if (VERBOSE) console.log(`Basekit scan could not run: ${inv.error}`);
    process.exit(0); // a failed scan must never get in the way of a session
  }

  const registry = c.loadRegistry();
  const a = analyse(inv, registry, state);
  c.writeJson(stateFile, { lastScan: new Date().toISOString(), seen: a.allIds });

  if (VERBOSE) {
    console.log(verboseReport(a, registry, inv));
    process.exit(0);
  }

  const text = summarise(a);
  if (!text) process.exit(0);
  c.emit({
    systemMessage: text,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
  });
}

main();
