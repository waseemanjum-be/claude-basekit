'use strict';
// Which files the hooks treat as code, as UI, as generated, or as places where literals are expected.

const path = require('path');

const SOURCE_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.kt',
  '.rb', '.php', '.cs', '.swift', '.scala', '.vue', '.svelte',
]);

const UI_EXT = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.css', '.scss', '.sass', '.less', '.html']);

// Never written by hand: no rule applies.
const GENERATED_PATH =
  /(^|\/)(node_modules|vendor|dist|build|out|coverage|\.next|\.nuxt|target|__pycache__|generated|gen)\//i;

// Written by hand, but literals are expected: tests, fixtures, the config layer, migrations, examples.
const LITERALS_OK_PATH = new RegExp(
  [
    '(^|/)(migrations?|tests?|__tests__|spec|e2e|fixtures?|mocks?|__mocks__|stories|scripts|examples?|docs?)/',
    '(^|/)(config|configs|configuration|settings|conf)(/|\\.[a-z]+$)',
    '\\.(test|spec|stories|config|d)\\.[a-z]+$',
    '_test\\.(go|py|rb)$',
    '(^|/)test_[^/]+\\.py$',
    '(^|/)conftest\\.py$',
  ].join('|'),
  'i'
);

/** Path relative to the working directory, with forward slashes on every OS. */
function relative(file, cwd) {
  return path.relative(cwd || process.cwd(), file).split(path.sep).join('/');
}

/** 'ui', 'code' or null for a file the standards do not cover. */
function kind(file) {
  const ext = path.extname(file).toLowerCase();
  if (UI_EXT.has(ext)) return 'ui';
  if (SOURCE_EXT.has(ext)) return 'code';
  return null;
}

/** True for hand-written code, tests included. Used to decide what a review should cover. */
function isReviewable(rel) {
  return kind(rel) !== null && !GENERATED_PATH.test(rel);
}

/** True for production source where a literal should be explained. */
function isProductionSource(rel) {
  return SOURCE_EXT.has(path.extname(rel).toLowerCase()) && !GENERATED_PATH.test(rel) && !LITERALS_OK_PATH.test(rel);
}

module.exports = { SOURCE_EXT, UI_EXT, GENERATED_PATH, LITERALS_OK_PATH, relative, kind, isReviewable, isProductionSource };
