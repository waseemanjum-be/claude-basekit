#!/usr/bin/env node
'use strict';
/*
 * Basekit review gate.
 *
 *   node review-gate.js --record   SubagentStop hook: notes that a Basekit reviewer finished
 *   node review-gate.js --check    PreToolUse hook on Bash: looks at a `git commit` before it runs
 *
 * With review_on_commit = require, a commit that adds review_min_lines or more of
 * code is stopped until every reviewer in review_agents has run in this session
 * since the last commit. With remind, the same message is a note and the commit
 * goes ahead. A commit message containing [skip review] passes, and the gate
 * stops blocking after review_max_blocks attempts, so it cannot deadlock a session.
 *
 * It only reads the staged diff and its own state file. It fails open.
 */

const path = require('path');
const c = require('./lib/common');
const files = require('./lib/files');
const g = require('./lib/git');

const PLUGIN = require(path.join(c.PLUGIN_ROOT, '.claude-plugin', 'plugin.json')).name;
const SKIP_MARKER = '[skip review]';

const required = () =>
  String(c.setting('review_agents'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function record(input) {
  const agent = String(input.agent_type || '').split(':').pop();
  if (!required().includes(agent)) return;
  const session = c.sessionState(input.session_id);
  const at = g.head(input.cwd || process.cwd());
  // Keep reviews for the current commit only: a new commit needs a new review.
  const reviews = session.data.reviews && session.data.reviews.head === at ? session.data.reviews : { head: at, agents: {}, blocks: 0 };
  reviews.agents[agent] = new Date().toISOString();
  session.data.reviews = reviews;
  session.save();
}

function check(input) {
  const mode = c.setting('review_on_commit');
  if (mode === 'off') return;
  const command = String((input.tool_input || {}).command || '');
  if (!g.isCommit(command) || command.includes(SKIP_MARKER)) return;

  const cwd = input.cwd || process.cwd();
  const lines = g.addedLines(command, cwd).filter((l) => files.isReviewable(l.file) && l.text.trim());
  if (lines.length < c.setting('review_min_lines')) return;

  const session = c.sessionState(input.session_id);
  const at = g.head(cwd);
  const reviews = session.data.reviews && session.data.reviews.head === at ? session.data.reviews : { head: at, agents: {}, blocks: 0 };
  const missing = required().filter((a) => !reviews.agents[a]);
  if (!missing.length) return;

  const changed = [...new Set(lines.map((l) => l.file))];
  const what =
    `Basekit review gate: this commit adds ${lines.length} lines of code in ${changed.length} file(s) ` +
    `(${changed.slice(0, 4).join(', ')}${changed.length > 4 ? ', ...' : ''}), and these reviewers have not run in this ` +
    `session since the last commit: ${missing.join(', ')}.`;
  const how =
    ` Run the \`${PLUGIN}:review\` skill on the staged changes, or start the subagents ` +
    `${missing.map((a) => `${PLUGIN}:${a}`).join(', ')} in parallel on the staged diff. ` +
    'If the review has no must-fix findings, commit again. If it has any, show them to the user instead of committing.';

  const maxBlocks = c.setting('review_max_blocks');
  if (mode === 'require' && reviews.blocks < maxBlocks) {
    reviews.blocks += 1;
    session.data.reviews = reviews;
    session.save();
    c.emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `${what}${how} If the user has said to commit without review, add ${SKIP_MARKER} to the commit message. ` +
          `(Stop ${reviews.blocks} of ${maxBlocks}; after that the gate lets the commit through with a note.)`,
      },
    });
  }
  c.emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: `${what}${how}` } });
}

try {
  const input = c.readHookInput();
  if (process.argv.includes('--record')) record(input);
  else check(input);
} catch (err) {
  process.stderr.write(`basekit review-gate error (ignored): ${err.message}\n`);
}
