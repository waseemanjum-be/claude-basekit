'use strict';
// Secret detection shared by the write guard and the commit guard.
// "high" rules match credential formats with a fixed, recognisable shape.
// "medium" rules are heuristics and only ever produce a warning.

const HIGH = [
  ['aws-access-key-id', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['github-token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g],
  ['github-fine-grained-token', /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g],
  ['gitlab-token', /\bglpat-[A-Za-z0-9_-]{20,}\b/g],
  ['anthropic-api-key', /\bsk-ant-[A-Za-z0-9_-]{24,}/g],
  ['openai-api-key', /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{24,}/g],
  ['stripe-live-key', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ['slack-webhook', /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]{16,}/g],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{36}\b/g],
  ['sendgrid-key', /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g],
  ['private-key-block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g],
];

const MEDIUM = [
  ['credential-in-url', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?|https?):\/\/[^\s:@/'"]+:([^\s@/'"]{6,})@[^\s'"]+/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  [
    'hardcoded-credential',
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b["']?\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/gi,
  ],
];

const ALLOW_MARKER = /basekit:allow-secret|gitleaks:allow/;
const PLACEHOLDER =
  /example|changeme|change-me|placeholder|dummy|sample|fake|redacted|your[_-]|<[^>]+>|\$\{|\{\{|process\.env|os\.environ|getenv|x{6,}|\*{4,}|0{8,}|1234567/i;

function entropy(s) {
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  return Object.values(counts).reduce((h, n) => h - (n / s.length) * Math.log2(n / s.length), 0);
}

function mask(value) {
  const v = String(value);
  return `${v.slice(0, 4)}***(${v.length} chars)`;
}

/**
 * Scan text. Returns [{ rule, severity, line, masked }]. Never returns the value itself.
 */
function scan(text) {
  const findings = [];
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (ALLOW_MARKER.test(line)) return;
    for (const [rule, re] of HIGH) {
      for (const m of line.matchAll(re)) {
        if (/EXAMPLE/i.test(m[0]) && rule !== 'private-key-block') continue; // documented fake keys
        findings.push({ rule, severity: 'high', line: i + 1, masked: mask(m[0]) });
      }
    }
    for (const [rule, re] of MEDIUM) {
      for (const m of line.matchAll(re)) {
        const value = m[1] || m[0];
        if (PLACEHOLDER.test(m[0])) continue;
        if (rule !== 'jwt' && entropy(value) < 3.0) continue; // "passwordpassword" is not a secret
        findings.push({ rule, severity: 'medium', line: i + 1, masked: mask(value) });
      }
    }
  });
  return findings;
}

module.exports = { scan, mask };
