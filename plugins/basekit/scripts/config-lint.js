#!/usr/bin/env node
'use strict';
/*
 * Basekit config lint (PostToolUse hook, advisory only).
 *
 * After an edit to a source file it looks at the lines that edit added and
 * reports literals that usually belong in configuration: URLs, addresses,
 * tunable numbers, fixed feature switches, absolute paths, model names.
 * It never blocks. A line is exempt when it, or the line above it, carries a
 * `hardcoded: <reason>` comment. Each finding is reported once per session.
 *
 * Run by hand:  node config-lint.js --file path/to/file
 */

const fs = require('fs');
const path = require('path');
const c = require('./lib/common');

const SOURCE_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.kt',
  '.rb', '.php', '.cs', '.swift', '.scala', '.vue', '.svelte',
]);

// Places where literals are expected: tests, fixtures, the config layer itself, generated and vendored code.
const SKIP_PATH = new RegExp(
  [
    '(^|/)(node_modules|vendor|dist|build|out|coverage|\\.next|\\.nuxt|target|__pycache__|migrations?|generated|gen)/',
    '(^|/)(tests?|__tests__|spec|e2e|fixtures?|mocks?|__mocks__|stories|scripts|examples?|docs?)/',
    '(^|/)(config|configs|configuration|settings|conf)(/|\\.[a-z]+$)',
    '\\.(test|spec|stories|config|d)\\.[a-z]+$',
    '_test\\.(go|py|rb)$',
    '(^|/)test_[^/]+\\.py$',
    '(^|/)conftest\\.py$',
  ].join('|'),
  'i'
);

const COMMENT_LINE = /^\s*(\/\/|#|\*|\/\*|<!--|--\s|"""|''')/;
const IMPORT_LINE = /^\s*(import\b|from\s+\S+\s+import\b|export\s+.*\bfrom\b|const\s+.*=\s*require\(|require\(|use\s+\S+;|using\s+\S+;|package\s+\S+)/;
const EXEMPT = /hardcoded:/i;
const BENIGN_URL = /(w3\.org|schema\.org|json-schema\.org|example\.(com|org|net)|xmlns|localhost\/?["'`]?$|reactjs\.org\/link|fb\.me\/|mozilla\.org\/MPL|apache\.org\/licenses|opensource\.org)/i;

const RULES = [
  {
    id: 'url',
    re: /["'`](https?:\/\/[^\s"'`]+)["'`]?/,
    skip: (m) => BENIGN_URL.test(m[1]),
    say: (m) => `URL literal ${m[1].slice(0, 60)}`,
  },
  {
    id: 'address',
    re: /["'`](?:[^"'`\s]*@)?((?:\d{1,3}\.){3}\d{1,3}|localhost)(:\d{2,5})["'`/]/,
    say: (m) => `host and port literal ${m[1]}${m[2]}`,
  },
  {
    id: 'tunable',
    re: /\b((?:[A-Za-z_][A-Za-z0-9_]*)?(?:timeout|retries|retry|attempts|limit|ttl|interval|delay|port|threshold|batch|page_?size|per_?page|concurrency|pool_?size|expir[a-z]*|duration|max_?[a-z]+|min_?[a-z]+)[A-Za-z0-9_]*)\s*(?::\s*[A-Za-z<>\[\]| ]+)?\s*[:=]\s*(\d[\d_]*(?:\.\d+)?)\s*(?:[,;)}\s]|$)/i,
    skip: (m) => ['0', '1'].includes(m[2]),
    say: (m) => `tunable \`${m[1]}\` = ${m[2]}`,
  },
  {
    id: 'delay',
    re: /\b(setTimeout|setInterval|sleep|delay|wait_for|Thread\.sleep|time\.sleep)\s*\((?:[^()]|\([^()]*\))*?\b(\d{3,}|\d+\s*\*\s*\d+)\s*\)/,
    say: (m) => `${m[1]} with literal ${m[2]}`,
  },
  {
    id: 'switch',
    re: /\b((?:[A-Za-z_][A-Za-z0-9_]*)?(?:enable|disable|feature|flag|toggle|experimental|beta|use_?new|is_?new)[A-Za-z0-9_]*)\s*(?::\s*bool(?:ean)?)?\s*[:=]\s*(true|false|True|False)\b/i,
    skip: (m, line) => /\b(interface|type|def|function|func)\b/.test(line) && /[(]/.test(line), // default parameter values
    say: (m) => `feature switch \`${m[1]}\` fixed to ${m[2]}`,
  },
  {
    id: 'path',
    re: /["'`]((?:\/(?:home|Users|var|opt|srv|mnt|data)\/|[A-Za-z]:\\\\)[^"'`\s]*)["'`]/,
    say: (m) => `absolute path literal ${m[1].slice(0, 50)}`,
  },
  {
    id: 'model',
    re: /["'`]((?:claude-(?:opus|sonnet|haiku|fable|mythos|instant|\d)|gpt-\d|gemini-\d|o[1-9]-(?:mini|pro|preview)|llama-?\d|mistral-(?:large|medium|small|tiny|\d)|deepseek-(?:chat|coder|reasoner|v\d)|grok-\d)[a-z0-9.:-]*)["'`]/i,
    say: (m) => `model name literal ${m[1]}`,
  },
];

function lint(filePath, fileText, onlyLines) {
  const findings = [];
  const lines = fileText.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.length < 8 || trimmed.length > 400) return; // noise, or minified
    if (onlyLines && !onlyLines.has(trimmed)) return;
    if (COMMENT_LINE.test(line) || IMPORT_LINE.test(line)) return;
    if (EXEMPT.test(line) || (i > 0 && EXEMPT.test(lines[i - 1]))) return;
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (!m || (rule.skip && rule.skip(m, line))) continue;
      findings.push({ rule: rule.id, line: i + 1, text: rule.say(m), key: `${filePath}|${rule.id}|${trimmed}` });
    }
  });
  return findings;
}

function addedLineSet(tool, ti) {
  let text = '';
  if (tool === 'Edit') text = ti.new_string || '';
  else if (tool === 'MultiEdit') text = (ti.edits || []).map((e) => e.new_string || '').join('\n');
  else return null; // Write: the whole file is new
  return new Set(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 8));
}

function pruneOldState(dir) {
  const cutoff = Date.now() - 7 * 86400000;
  for (const f of fs.readdirSync(dir)) {
    if (!/^lint-.*\.json$/.test(f)) continue;
    const full = path.join(dir, f);
    try {
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    } catch {
      /* another session may have removed it */
    }
  }
}

function main() {
  const manual = process.argv.indexOf('--file');
  if (manual > -1) {
    const file = process.argv[manual + 1];
    const found = lint(file, fs.readFileSync(file, 'utf8'), null);
    console.log(found.length ? found.map((f) => `${file}:${f.line}  ${f.text}`).join('\n') : 'No findings.');
    return;
  }

  if (c.setting('config_lint') === 'off') return;
  const input = c.readHookInput();
  const ti = input.tool_input || {};
  const file = ti.file_path;
  if (!file || !SOURCE_EXT.has(path.extname(file).toLowerCase())) return;

  const rel = path.relative(input.cwd || process.cwd(), file).split(path.sep).join('/');
  if (SKIP_PATH.test(rel)) return;

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  let findings = lint(rel, text, addedLineSet(input.tool_name, ti));
  if (!findings.length) return;

  // Report each finding once per session.
  const dir = c.dataDir();
  const stateFile = path.join(dir, `lint-${String(input.session_id || 'manual').replace(/[^A-Za-z0-9_-]/g, '')}.json`);
  const firstWrite = !fs.existsSync(stateFile);
  const seen = new Set(c.readJson(stateFile, []));
  findings = findings.filter((f) => !seen.has(f.key));
  if (!findings.length) return;
  findings.forEach((f) => seen.add(f.key));
  c.writeJson(stateFile, [...seen]);
  if (firstWrite) pruneOldState(dir);

  const max = c.setting('config_lint_max_findings');
  const shown = findings.slice(0, max).map((f) => `line ${f.line} ${f.text}`);
  if (findings.length > max) shown.push(`and ${findings.length - max} more`);
  c.emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `Basekit config lint, ${rel}: ${shown.join('; ')}. ` +
        'Project standard: a value that can differ by environment, deployment, customer or time lives in the typed ' +
        'config module with a documented default. A literal that should stay needs a `hardcoded: <reason>` comment ' +
        'on or above the line. These are heuristics; ignore the ones that are not configuration.',
    },
  });
}

try {
  main();
} catch (err) {
  process.stderr.write(`basekit config-lint error (ignored): ${err.message}\n`);
}
