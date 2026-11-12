'use strict';
// Shared helpers for Basekit scripts. No dependencies, Node 18+.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULTS = require(path.join(PLUGIN_ROOT, 'config.defaults.json'));

/**
 * Read one setting. Order: BASEKIT_<KEY> env var, then config.defaults.json.
 * Values are coerced to the type of the default so "48" becomes 48.
 */
function setting(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unknown Basekit setting: ${key}`);
  const fallback = DEFAULTS[key];
  const raw = process.env[`BASEKIT_${key.toUpperCase()}`];
  if (raw === undefined || raw === '') return fallback;
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }
  return String(raw).trim().toLowerCase();
}

/** Directory for state that must survive plugin updates. */
function dataDir() {
  const dir =
    process.env.CLAUDE_PLUGIN_DATA ||
    path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'basekit-data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write via a temp file and rename so a crash never leaves half a file. */
function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

/** Hook input arrives as JSON on stdin. Returns {} when run by hand. */
function readHookInput() {
  if (process.stdin.isTTY) return {};
  try {
    const text = fs.readFileSync(0, 'utf8');
    return text.trim() ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

const STATE_MAX_AGE_DAYS = 7; // hardcoded: per-session scratch files are useless once the session is long gone

/**
 * Per-session scratch state shared by the hooks: findings already reported,
 * lines edited this turn, reviewers that have run. Returns { data, save }.
 */
function sessionState(sessionId) {
  const dir = dataDir();
  const id = String(sessionId || 'manual').replace(/[^A-Za-z0-9_-]/g, '') || 'manual';
  const file = path.join(dir, `session-${id}.json`);
  const isNew = !fs.existsSync(file);
  const data = readJson(file, {});
  return {
    data,
    save() {
      writeJson(file, data);
      if (isNew) pruneSessionState(dir);
    },
  };
}

function pruneSessionState(dir) {
  const cutoff = Date.now() - STATE_MAX_AGE_DAYS * 86400000;
  for (const f of fs.readdirSync(dir)) {
    if (!/^(session|lint)-.*\.json$/.test(f)) continue;
    const full = path.join(dir, f);
    try {
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    } catch {
      /* another session may have removed it */
    }
  }
}

function loadRegistry() {
  return readJson(path.join(PLUGIN_ROOT, 'registry.json'), { entries: [], reviewed: null });
}

function daysSince(isoDate) {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/** Print a hook JSON result and exit 0. */
function emit(result) {
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

module.exports = {
  PLUGIN_ROOT,
  DEFAULTS,
  setting,
  dataDir,
  readJson,
  writeJson,
  readHookInput,
  sessionState,
  loadRegistry,
  daysSince,
  emit,
};
