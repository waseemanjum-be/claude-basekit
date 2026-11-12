#!/usr/bin/env node
'use strict';
/*
 * Basekit secret guard (PreToolUse hook).
 *
 *   node secret-guard.js            checks the text a Write/Edit is about to put in a file
 *   node secret-guard.js --staged   checks what a `git commit` is about to commit
 *
 * Mode comes from the secret_guard setting (block | warn | off):
 *   block  high-confidence secrets deny the tool call; heuristic hits are reported as a note
 *   warn   everything is reported as a note, nothing is denied
 *
 * The guard fails open: if it crashes, the tool call proceeds. It is a seat belt,
 * not the only control. Run a scanner in CI as well.
 */

const { spawnSync } = require('child_process');
const c = require('./lib/common');
const { scan } = require('./lib/secrets');
const { isCommit, addedLines } = require('./lib/git');

const STAGED = process.argv.includes('--staged');
const MAX_REPORTED = 6; // hardcoded: keeps the message to Claude short; the rest is counted, not listed

function textFromToolInput(tool, input) {
  if (!input) return '';
  if (tool === 'Write') return input.content || '';
  if (tool === 'Edit') return input.new_string || '';
  if (tool === 'MultiEdit') return (input.edits || []).map((e) => e.new_string || '').join('\n');
  if (tool === 'NotebookEdit') return input.new_source || '';
  return '';
}

function gitleaks(cwd) {
  const r = spawnSync('gitleaks', ['git', '--pre-commit', '--redact', '--staged', '--no-banner'], {
    cwd,
    encoding: 'utf8',
    timeout: c.setting('gitleaks_timeout_ms'),
    windowsHide: true,
  });
  if (r.error || r.status === null) return null; // not installed, or timed out
  return { leaks: r.status === 1, tail: `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-12).join('\n') };
}

function describe(findings) {
  const shown = findings.slice(0, MAX_REPORTED).map((f) => `${f.where}: ${f.rule} ${f.masked}`);
  if (findings.length > MAX_REPORTED) shown.push(`and ${findings.length - MAX_REPORTED} more`);
  return shown.join('; ');
}

const ADVICE =
  'Project rule: secrets never go in files, tests, logs or commits. Read the value from an environment variable ' +
  'or the secret manager, put only the variable NAME in .env.example, and if this is a real credential tell the ' +
  'user it is exposed and must be rotated. A deliberate fake for a test needs `basekit:allow-secret` on the same line.';

function main() {
  const mode = c.setting('secret_guard');
  if (mode === 'off') process.exit(0);

  const input = c.readHookInput();
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  let findings = [];
  let extra = '';

  if (STAGED) {
    const command = String(ti.command || '');
    if (!isCommit(command)) process.exit(0);
    for (const l of addedLines(command, input.cwd || process.cwd())) {
      for (const f of scan(l.text)) findings.push({ ...f, where: `${l.file}:${l.line}` });
    }
    const gl = gitleaks(input.cwd || process.cwd());
    if (gl && gl.leaks) {
      findings.push({ rule: 'gitleaks', severity: 'high', where: 'staged changes', masked: '(see gitleaks output)' });
      extra = ` gitleaks output (redacted): ${gl.tail}`;
    }
  } else {
    const file = ti.file_path || ti.notebook_path || 'the file';
    for (const f of scan(textFromToolInput(tool, ti))) {
      findings.push({ ...f, where: `${file} (line ${f.line} of the new text)` });
    }
  }

  if (!findings.length) process.exit(0);

  const high = findings.filter((f) => f.severity === 'high');
  const what = STAGED ? 'this commit' : 'this edit';
  if (mode === 'block' && high.length) {
    c.emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Basekit secret guard stopped ${what}: ${describe(high)}.${extra} ${ADVICE}`,
      },
    });
  }
  c.emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `Basekit secret guard: possible secret in ${what}: ${describe(findings)}.${extra} ${ADVICE}`,
    },
  });
}

try {
  main();
} catch (err) {
  process.stderr.write(`basekit secret-guard error (ignored): ${err.message}\n`);
  process.exit(0);
}
