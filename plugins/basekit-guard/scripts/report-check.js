#!/usr/bin/env node
'use strict';
/*
 * Basekit report check (Stop hook).
 *
 * The house rules ask for a "Decisions and deviations" block after implementation
 * work: what was made configurable, what stayed hardcoded and why, what is not
 * configurable and why. When a turn added report_min_lines or more of production
 * source and the reply has no such block, this sends Claude back once to add it.
 *
 * It never loops: it does nothing when Claude is already continuing because of a
 * stop hook, and it clears its counter every time it runs. Replies that end with
 * a question are left alone, and the count carries to the next turn.
 */

const c = require('./lib/common');

const BLOCK_HEADING = /decisions\s+(and|&)\s+deviations/i;

function main() {
  if (c.setting('report_check') === 'off') return;
  const input = c.readHookInput();
  if (input.stop_hook_active) return;

  const session = c.sessionState(input.session_id);
  const turn = session.data.turn;
  if (!turn || !turn.lines) return;

  const reply = String(input.last_assistant_message || '').trim();
  if (reply.endsWith('?')) return; // Claude is waiting on the user; check when the work is actually done

  session.data.turn = { lines: 0, files: [] };
  session.save();

  if (turn.lines < c.setting('report_min_lines') || BLOCK_HEADING.test(reply)) return;

  const where = turn.files.slice(0, 4).join(', ') + (turn.files.length > 4 ? ', ...' : '');
  c.emit({
    decision: 'block',
    reason:
      `Basekit: this turn added about ${turn.lines} lines of source code (${where}) and the reply has no ` +
      '"Decisions and deviations" block. Add it now, without redoing any work: config added (key, default, where ' +
      'documented); values kept hardcoded and why; behaviour that is not configurable and why; trade-offs; debt ' +
      'introduced; what was verified (commands and results); what was not verified. Leave out lines that are empty.',
  });
}

try {
  main();
} catch (err) {
  process.stderr.write(`basekit report-check error (ignored): ${err.message}\n`);
}
