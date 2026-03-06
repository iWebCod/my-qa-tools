#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const bumpType = process.argv[2];
const valid = new Set(['patch', 'minor', 'major']);
if (!valid.has(bumpType)) {
  console.error('Usage: node scripts/release-version.js <patch|minor|major>');
  process.exit(1);
}

const root = process.cwd();
const pkgPath = path.join(root, 'backend', 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

if (!fs.existsSync(pkgPath)) {
  console.error(`Missing file: ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = String(pkg.version || '0.1.0');

function bump(version, type) {
  const parts = version.split('.').map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n) || n < 0)) {
    throw new Error(`Invalid semver: ${version}`);
  }

  let [major, minor, patch] = parts;
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const newVersion = bump(oldVersion, bumpType);
pkg.version = newVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

const today = new Date().toISOString().slice(0, 10);
const nextEntry = [
  `## [${newVersion}] - ${today}`,
  '',
  '### Changed',
  '',
  '- TBD',
  '',
].join('\n');

if (fs.existsSync(changelogPath)) {
  const current = fs.readFileSync(changelogPath, 'utf8');
  const marker = '## [';
  const idx = current.indexOf(marker);
  if (idx >= 0) {
    const updated = `${current.slice(0, idx)}${nextEntry}${current.slice(idx)}`;
    fs.writeFileSync(changelogPath, updated, 'utf8');
  } else {
    fs.writeFileSync(changelogPath, `${current}\n\n${nextEntry}`, 'utf8');
  }
} else {
  const header = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on Keep a Changelog, and this project follows Semantic Versioning.',
    '',
  ].join('\n');
  fs.writeFileSync(changelogPath, `${header}${nextEntry}`, 'utf8');
}

console.log(`Version bumped: ${oldVersion} -> ${newVersion}`);
console.log(`Updated: ${pkgPath}`);
console.log(`Updated: ${changelogPath}`);
