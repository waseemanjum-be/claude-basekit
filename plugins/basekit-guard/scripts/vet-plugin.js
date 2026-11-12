#!/usr/bin/env node
'use strict';
/*
 * Basekit static vetting scan for a plugin, skill or tool checkout.
 *
 *   node vet-plugin.js <directory> [--json] [--strict]
 *
 * It only reads files. It never runs, installs or imports anything from the
 * directory. It reports what would run on your machine (hooks, MCP servers,
 * bin/, install scripts), patterns that deserve a human look, outbound hosts,
 * and a rough always-on token estimate.
 *
 * The result is a triage level, not a verdict:
 *   READ_LINES  executable or instruction files contain high-signal lines (fetch-and-run,
 *               package registry redirects, remote shells, hidden or override instructions).
 *               Many hits are benign (a comment, a sanitiser, an error hint). Read each cited line.
 *   RUNS_CODE   it has hooks, MCP servers, bin/ or install scripts. Read those files.
 *   TEXT_ONLY   instructions only, and nothing matched. That is not proof of safety.
 * --strict exits 2 on READ_LINES.
 */

const fs = require('fs');
const path = require('path');

// Scan bounds keep a run to a few seconds on a very large repository.
const MAX_FILES = 8000; // hardcoded: file cap; the report says when it was reached
const MAX_FILE_BYTES = 512 * 1024; // hardcoded: larger files are bundles or data, not hand-written hooks
const MAX_SAMPLES = 3; // hardcoded: example locations shown per pattern
const DESCRIPTION_CAP = 1536; // Claude Code truncates skill descriptions at this length
const TEXT_EXT = new Set([
  '.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.py', '.sh', '.bash', '.zsh', '.ps1', '.cmd', '.bat',
  '.yaml', '.yml', '.toml', '.rb', '.go', '.rs', '',
]);
const SKIP_DIR = /^(\.git|node_modules|dist|build|target|coverage|\.next|__pycache__|\.venv|venv|vendor)$/;
const TEST_PATH = /(^|\/)(tests?|__tests__|evals?|benchmarks?|fixtures?|testdata|examples?)\//i;

function classify(rel) {
  const base = path.basename(rel).toLowerCase();
  if (/(^|\/)(hooks|scripts|bin)\//.test(rel) || /\.(sh|bash|zsh|ps1|cmd|bat|py|js|mjs|cjs|ts|rb)$/.test(rel)) return 'exec';
  if (base === 'hooks.json' || base === '.mcp.json' || base === 'plugin.json' || base === 'package.json') return 'exec';
  if (base === 'skill.md' || /(^|\/)(agents|commands|skills)\//.test(rel) || base === 'claude.md' || base === 'agents.md') return 'instructions';
  return 'docs';
}

// [severity, id, meaning, pattern, onlyIn]. severity: 3 read first, 2 worth a look, 1 info.
// Findings in docs drop one level. A rule with onlyIn keeps full severity only in that file
// kind and drops one level elsewhere, because source code legitimately contains such strings.
const PATTERNS = [
  [3, 'pipe-to-shell', 'downloads a script and pipes it to a shell', /(?:curl|wget|iwr|Invoke-WebRequest)\b[^\n|]{0,200}\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b|\|\s*iex\b|Invoke-Expression/i],
  [3, 'encoded-exec', 'decodes and executes hidden content', /base64\s+(?:-d|--decode)[^\n]{0,80}\|\s*(?:ba)?sh|eval\s*\(\s*(?:atob|Buffer\.from)\s*\(|exec\s*\(\s*base64\.b64decode/i],
  [3, 'reverse-shell', 'opens a remote shell', /(?:ba)?sh\s+-i\s+[0-9]?[<>]&\s*\/dev\/tcp|\bn(?:c|cat)\b[^\n|]{0,60}\s-e\s+\S*sh\b/],
  [2, 'credential-files', 'names credential stores (check whether it reads or protects them)', /(?:\.ssh\/id_[a-z0-9]+|\.aws\/credentials|\.netrc\b|\.config\/gh\/hosts|\.docker\/config\.json|\.kube\/config|security\s+find-(?:generic|internet)-password|Login Data|\.gnupg\/)/],
  [3, 'registry-redirect', 'points a package manager at a non-default registry', /--(?:extra-)?index-url\b|PIP_INDEX_URL|npm\s+config\s+set\s+registry|--registry[= ]https?:\/\/(?!registry\.npmjs\.org|127\.0\.0\.1|localhost)/i],
  [3, 'hidden-unicode', 'instruction file contains invisible or direction-overriding characters', /[\u200B\u2060\u202A-\u202E\u2066-\u2069]|\uDB40[\uDC00-\uDC7F]/, 'instructions'],
  [3, 'instruction-override', 'tells the model to hide actions or ignore instructions', /(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+instructions|do\s+not\s+(?:tell|inform|notify)\s+the\s+user|without\s+(?:asking|telling|informing)\s+the\s+user|keep\s+this\s+(?:secret|hidden)\s+from\s+the\s+user/i, 'instructions'],
  [2, 'permission-bypass', 'refers to skipping permission checks or disabling hooks', /bypassPermissions|dangerously-skip-permissions|disableAllHooks/],
  [2, 'claude-config-write', 'touches Claude Code settings or memory files', /\.claude\/settings(?:\.local)?\.json|\.claude\.json\b|settings\.json["'`]?\s*,?\s*(?:JSON\.stringify|json\.dump)/],
  [2, 'persistence', 'edits shell profiles or scheduled jobs', /\.(?:bashrc|zshrc|bash_profile|profile)\b|crontab\s+-|launchctl\s+(?:load|bootstrap)|systemctl\s+(?:--user\s+)?enable|schtasks\s+\/create/i],
  [2, 'unpinned-fetch', 'fetches unpinned code at run time', /npx\s+(?:-y\s+|--yes\s+)?[@\w./-]+@latest|uvx\s+--from\s+git\+https|pip\s+install\s+git\+https/i],
  [2, 'remote-instructions', 'loads instructions from a URL at run time', /(?:fetch|webfetch|curl|retrieve)[^\n]{0,80}https?:\/\/\S+(?:\.md\b|raw\.githubusercontent\.com)/i],
  [2, 'sudo', 'asks for root', /(?:^|[\s;&|])sudo\s+\S/m],
  [1, 'telemetry', 'mentions telemetry or analytics', /posthog|mixpanel|amplitude|segment\.(?:io|com)|sentry\.io|\btelemetry\b|\banalytics\b/i],
  [1, 'credential-env', 'reads API credentials from the environment', /\b(?:ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|GH_TOKEN)\b/],
];

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length && files.length < MAX_FILES) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue; // never follow links out of the checkout
      if (e.isDirectory()) {
        if (!SKIP_DIR.test(e.name)) stack.push(full);
      } else if (e.isFile() && TEXT_EXT.has(path.extname(e.name).toLowerCase())) {
        files.push(full);
      }
    }
  }
  return files;
}

function read(file) {
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function json(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function hookCommands(hooksObj, source, out) {
  for (const [event, groups] of Object.entries(hooksObj || {})) {
    for (const g of Array.isArray(groups) ? groups : []) {
      for (const h of g.hooks || []) {
        const cmd = h.type === 'command' ? [h.command].concat(h.args || []).join(' ') : `${h.type}: ${h.url || h.prompt || h.tool || ''}`;
        const everyCall = ['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop'].includes(event) && (!g.matcher || g.matcher === '*');
        out.push({ event, matcher: g.matcher || '(all)', command: String(cmd).slice(0, 220), everyCall, source });
      }
    }
  }
}

function frontmatterDescription(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) return '';
  const lines = fm[1].split(/\r?\n/);
  const start = lines.findIndex((l) => /^description:/.test(l));
  if (start < 0) return '';
  const parts = [lines[start].replace(/^description:\s*/, '')];
  // A folded or multi-line value continues until the next top-level key.
  for (let i = start + 1; i < lines.length && !/^[A-Za-z][\w-]*:/.test(lines[i]); i++) parts.push(lines[i].trim());
  return parts.join(' ').replace(/^[>|][-+]?\s*/, '').replace(/^["']|["']$/g, '').trim();
}

function scan(root) {
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const files = walk(root);
  const report = {
    directory: root,
    filesScanned: files.length,
    truncated: files.length >= MAX_FILES,
    manifests: [],
    licence: 'not found',
    hooks: [],
    mcpServers: [],
    binFiles: [],
    installScripts: [],
    findings: [],
    hosts: {},
    skills: 0,
    agents: 0,
    estimatedAlwaysOnTokens: 0,
  };
  const byId = new Map();
  let descriptionChars = 0;

  for (const file of files) {
    const r = rel(file);
    const base = path.basename(r);
    const lower = base.toLowerCase();

    if (/^licen[sc]e/i.test(base) && !r.includes('/')) {
      const head = (read(file) || '').slice(0, 400);
      const m = /(MIT License|Apache License|GNU AFFERO|GNU GENERAL PUBLIC|GNU LESSER|BSD [23]-Clause|Mozilla Public|Creative Commons|Business Source|Elastic License|PolyForm|Functional Source)/i.exec(head);
      report.licence = m ? m[1] : 'present, type not recognised';
    }
    if (lower === 'plugin.json' && r.includes('.claude-plugin')) {
      const j = json(file) || {};
      report.manifests.push({ file: r, name: j.name, version: j.version });
      if (j.hooks && typeof j.hooks === 'object' && !Array.isArray(j.hooks)) hookCommands(j.hooks, r, report.hooks);
      for (const [name, s] of Object.entries(j.mcpServers && typeof j.mcpServers === 'object' ? j.mcpServers : {})) {
        report.mcpServers.push({ name, run: s.url || [s.command].concat(s.args || []).join(' '), source: r });
      }
    }
    if (lower === 'hooks.json') {
      const j = json(file) || {};
      hookCommands(j.hooks || j, r, report.hooks);
    }
    if (lower === '.mcp.json') {
      const j = json(file) || {};
      for (const [name, s] of Object.entries(j.mcpServers || j)) {
        if (s && typeof s === 'object') report.mcpServers.push({ name, run: s.url || [s.command].concat(s.args || []).join(' '), source: r });
      }
    }
    if (lower === 'package.json' && !TEST_PATH.test(r)) {
      const scripts = (json(file) || {}).scripts || {};
      for (const k of ['preinstall', 'install', 'postinstall', 'prepare']) {
        if (scripts[k]) report.installScripts.push({ file: r, script: k, run: String(scripts[k]).slice(0, 160) });
      }
    }
    if (/(^|\/)bin\/[^/]+$/.test(r)) report.binFiles.push(r);

    if (path.resolve(file) === __filename) continue; // this file's own pattern table would match itself
    const text = read(file);
    if (text === null) continue;

    if (lower === 'skill.md' && !TEST_PATH.test(r)) {
      report.skills++;
      if (!/^disable-model-invocation:\s*(true|yes|on|1)\s*$/m.test(text.slice(0, 2000))) {
        descriptionChars += Math.min(frontmatterDescription(text).length, DESCRIPTION_CAP);
      }
    }
    if (/(^|\/)agents\/[^/]+\.md$/.test(r) && !TEST_PATH.test(r)) {
      report.agents++;
      descriptionChars += frontmatterDescription(text).length;
    }

    if (TEST_PATH.test(r)) continue; // fixtures routinely contain attack strings
    const kind = classify(r);
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
      if (line.length > 2000) return;
      // A comment in source code describes; it does not run.
      const commented = kind === 'exec' && /^\s*(?:\/\/|#(?!!)|\*|\/\*)/.test(line);
      for (const [sev, id, what, re, onlyIn] of PATTERNS) {
        if (commented && id !== 'hidden-unicode') continue;
        if (!re.test(line)) continue;
        if (id === 'hidden-unicode' && kind === 'exec') continue; // sanitiser literals
        const lowered = kind === 'docs' || (onlyIn && kind !== onlyIn);
        const severity = lowered ? Math.max(1, sev - 1) : sev;
        const key = `${id}|${severity}`;
        if (!byId.has(key)) byId.set(key, { id, what, severity, count: 0, samples: [] });
        const f = byId.get(key);
        f.count++;
        if (f.samples.length < MAX_SAMPLES) f.samples.push(`${r}:${i + 1}`);
      }
      if (kind === 'exec') {
        for (const m of line.matchAll(/https?:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)) {
          report.hosts[m[1].toLowerCase()] = (report.hosts[m[1].toLowerCase()] || 0) + 1;
        }
      }
    });
  }

  for (const s of report.mcpServers) {
    if (/@latest|git\+https/.test(s.run)) s.note = 'unpinned: the code that runs can change between sessions';
    else if (/^https?:/.test(s.run)) s.note = 'remote server: tool inputs leave this machine';
  }

  report.findings = [...byId.values()].sort((a, b) => b.severity - a.severity || b.count - a.count);
  report.estimatedAlwaysOnTokens = Math.round(descriptionChars / 4);

  const top = report.findings.reduce((m, f) => Math.max(m, f.severity), 0);
  const runsCode = report.hooks.length || report.mcpServers.length || report.binFiles.length || report.installScripts.length;
  report.result = top === 3 ? 'READ_LINES' : runsCode ? 'RUNS_CODE' : 'TEXT_ONLY';
  return report;
}

function print(r) {
  const sevName = { 3: 'READ  ', 2: 'LOOK  ', 1: 'INFO  ' };
  const L = [];
  L.push(`Basekit vet: ${r.directory}`);
  L.push(`Result: ${r.result}   files scanned: ${r.filesScanned}${r.truncated ? ' (cap reached, scan incomplete)' : ''}   licence: ${r.licence}`);
  L.push(`Manifests: ${r.manifests.map((m) => `${m.name || '?'} ${m.version || ''} (${m.file})`).join('; ') || 'none'}`);
  L.push(`Skills: ${r.skills}   Agents: ${r.agents}   Rough always-on tokens from descriptions: ~${r.estimatedAlwaysOnTokens}`);
  L.push('');
  L.push(`Runs on your machine`);
  L.push(`  Hooks (${r.hooks.length})`);
  for (const h of r.hooks.slice(0, 20)) L.push(`    ${h.event} [${h.matcher}]${h.everyCall ? ' EVERY CALL' : ''}  ${h.command}`);
  L.push(`  MCP servers (${r.mcpServers.length})`);
  for (const s of r.mcpServers.slice(0, 20)) L.push(`    ${s.name}: ${s.run}${s.note ? `  <- ${s.note}` : ''}`);
  L.push(`  bin/ executables (${r.binFiles.length})${r.binFiles.length ? ': ' + r.binFiles.slice(0, 10).join(', ') : ''}`);
  L.push(`  Package install scripts (${r.installScripts.length})`);
  for (const s of r.installScripts.slice(0, 10)) L.push(`    ${s.file} ${s.script}: ${s.run}`);
  L.push('');
  L.push('Patterns to read yourself');
  if (!r.findings.length) L.push('  none matched');
  for (const f of r.findings) L.push(`  ${sevName[f.severity]} ${f.id} x${f.count}: ${f.what}  e.g. ${f.samples.join(', ')}`);
  L.push('');
  const hosts = Object.entries(r.hosts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  L.push(`Hosts named in executable files: ${hosts.map(([h, n]) => `${h} (${n})`).join(', ') || 'none'}`);
  L.push('');
  L.push('This is a pattern scan of files at rest, a list of lines to read rather than a verdict.');
  L.push('READ_LINES: read every READ line. RUNS_CODE: read the hooks, MCP config, bin/ and install scripts. TEXT_ONLY: nothing matched.');
  L.push('For the exact component list and token cost: claude --plugin-dir <plugin dir> plugin details <name>');
  console.log(L.join('\n'));
}

function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error('Usage: node vet-plugin.js <directory> [--json] [--strict]');
    process.exit(64);
  }
  const report = scan(path.resolve(dir));
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else print(report);
  process.exit(args.includes('--strict') && report.result === 'READ_LINES' ? 2 : 0);
}

main();
