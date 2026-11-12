'use strict';
// Read-only git helpers shared by the commit hooks.

const { spawnSync } = require('child_process');

function git(args, cwd) {
  // hardcoded: output ceiling for one diff; a larger diff returns '' and the caller fails open
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  return r.status === 0 ? r.stdout : '';
}

/** True when a shell command contains a `git ... commit` invocation. */
function isCommit(command) {
  return /(^|[\s;&|(])git\b[^;&|]*\bcommit\b/.test(String(command || ''));
}

/** Lines a commit would add, as [{ file, line, text }]. */
function addedLines(command, cwd) {
  // `git commit -a` also commits unstaged changes to tracked files.
  const all = /\s-(?:[a-zA-Z]*a[a-zA-Z]*|-all)\b/.test(command);
  const diff = git(['diff', all ? 'HEAD' : '--cached', '-U0', '--no-color', '--no-ext-diff'], cwd);
  const out = [];
  let file = '';
  let lineNo = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.slice(4).replace(/^b\//, '');
    } else if (raw.startsWith('@@')) {
      const m = /\+(\d+)/.exec(raw);
      lineNo = m ? Number(m[1]) : 0;
    } else if (raw.startsWith('+')) {
      out.push({ file, line: lineNo++, text: raw.slice(1) });
    }
  }
  return out;
}

/** Current commit, or a fixed marker in a repository with no commits yet. */
function head(cwd) {
  return git(['rev-parse', 'HEAD'], cwd).trim() || 'no-commits-yet';
}

module.exports = { git, isCommit, addedLines, head };
