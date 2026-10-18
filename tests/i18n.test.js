'use strict';
/** Guard: the repository must stay English-only (no Czech diacritics). */
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/harness');
const { makeChecker } = require('./lib/harness');

const CZECH = /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.godot']);
// Files that intentionally quote the original Czech names (project history).
const ALLOW = new Set(['README.md', 'docs/GLOSSARY.md', 'tests/i18n.test.js']);
const TEXT_EXT = new Set(['.js', '.html', '.css', '.md', '.json', '.py', '.gd', '.cpp', '.h', '.cs', '.ini', '.txt', '.bat', '.tscn', '.cfg', '.godot', '.uproject']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TEXT_EXT.has(path.extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

const check = makeChecker('i18n');
const offenders = [];
for (const f of walk(ROOT)) {
  if (ALLOW.has(path.relative(ROOT, f).split(path.sep).join('/'))) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (CZECH.test(line)) offenders.push(`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 80)}`); });
}
check(offenders.length === 0, offenders.length ? 'Czech text found:\n    ' + offenders.slice(0, 20).join('\n    ') : 'no Czech diacritics in any text file');
process.exit(check.done() ? 0 : 1);
