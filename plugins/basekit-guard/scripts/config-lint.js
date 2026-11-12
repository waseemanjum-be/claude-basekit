#!/usr/bin/env node
'use strict';
/*
 * Basekit edit notes (PostToolUse hook, advisory only). Three jobs in one process:
 *
 * 1. Config lint. Looks at the lines an edit added to production source and
 *    reports literals that usually belong in configuration: URLs, addresses,
 *    tunable numbers, fixed feature switches, absolute paths, model names.
 *    A line is exempt when it, or the line above it, carries a
 *    `hardcoded: <reason>` comment. Each finding is reported once per session.
 * 2. Standards nudge. The first time a session edits backend or UI code, it
 *    names the standards skill that holds the house rules for it.
 * 3. Turn accounting. Counts source lines added this turn, which the Stop hook
 *    (report-check.js) uses to ask for the Decisions and deviations block.
 *
 * It never blocks.   Run the lint by hand:  node config-lint.js --file path/to/file
 */

const fs = require('fs');
const c = require('./lib/common');

const files = require('./lib/files');

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

function addedText(tool, ti) {
  if (tool === 'Write') return ti.content || '';
  if (tool === 'Edit') return ti.new_string || '';
  if (tool === 'MultiEdit') return (ti.edits || []).map((e) => e.new_string || '').join('\n');
  return '';
}

const CORE = c.setting('core_plugin');
const NUDGE = {
  code:
    `the \`${CORE}:engineering-standards\` skill (` +
    'configuration over literals, secrets, error handling, tests, ' +
    'reuse, and the closing Decisions and deviations block)',
  ui:
    `the \`${CORE}:ui-standards\` skill (` +
    'reuse the project\'s components and libraries before writing any, ' +
    'cover every state, accessibility, check the result in a browser)',
};

function main() {
  const manual = process.argv.indexOf('--file');
  if (manual > -1) {
    const file = process.argv[manual + 1];
    const found = lint(file, fs.readFileSync(file, 'utf8'), null);
    console.log(found.length ? found.map((f) => `${file}:${f.line}  ${f.text}`).join('\n') : 'No findings.');
    return;
  }

  const input = c.readHookInput();
  const ti = input.tool_input || {};
  const file = ti.file_path;
  const kind = file && files.kind(file);
  if (!kind) return;
  const rel = files.relative(file, input.cwd);
  if (files.GENERATED_PATH.test(rel)) return;

  const session = c.sessionState(input.session_id);
  const notes = [];
  let dirty = false;
  const added = addedText(input.tool_name, ti);

  // 2. Standards nudge, once per session for each kind of code.
  if (c.setting('standards_nudge') !== 'off') {
    session.data.nudged = session.data.nudged || {};
    if (!session.data.nudged[kind]) {
      session.data.nudged[kind] = true;
      dirty = true;
      notes.push(
        `Basekit: this session is now editing ${kind === 'ui' ? 'UI' : 'backend or shared'} code (${rel}). ` +
          `The house rules for it are in ${NUDGE[kind]}. Its full text loads with the Skill tool if it is not already in context.`
      );
    }
  }

  if (files.isProductionSource(rel)) {
    // 3. Turn accounting for the report check.
    const turn = session.data.turn || { lines: 0, files: [] };
    turn.lines += added.split(/\r?\n/).filter((l) => l.trim()).length;
    if (!turn.files.includes(rel)) turn.files.push(rel);
    session.data.turn = turn;
    dirty = true;

    // 1. Config lint.
    if (c.setting('config_lint') !== 'off') {
      let text = '';
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        /* the file may have been moved since the edit */
      }
      const onlyLines =
        input.tool_name === 'Write' ? null : new Set(added.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 8));
      const seen = new Set(session.data.lintSeen || []);
      const findings = lint(rel, text, onlyLines).filter((f) => !seen.has(f.key));
      if (findings.length) {
        findings.forEach((f) => seen.add(f.key));
        session.data.lintSeen = [...seen];
        const max = c.setting('config_lint_max_findings');
        const shown = findings.slice(0, max).map((f) => `line ${f.line} ${f.text}`);
        if (findings.length > max) shown.push(`and ${findings.length - max} more`);
        notes.push(
          `Basekit config lint, ${rel}: ${shown.join('; ')}. ` +
            'Project standard: a value that can differ by environment, deployment, customer or time lives in the typed ' +
            'config module with a documented default. A literal that should stay needs a `hardcoded: <reason>` comment ' +
            'on or above the line. These are heuristics; ignore the ones that are not configuration.'
        );
      }
    }
  }

  if (dirty) session.save();
  if (notes.length) {
    c.emit({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: notes.join('\n\n') } });
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`basekit config-lint error (ignored): ${err.message}\n`);
}
