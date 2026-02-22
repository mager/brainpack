import fs from 'fs';
import path from 'path';
import { MANIFEST } from './manifest.js';

export const DEFAULT_IGNORE = ['TOOLS.md', '.env', '*.key', '.openclaw/', '.pi/', 'node_modules/'];

export function buildGitignore(ignoreList) {
  return [
    '# brainpack ignore list',
    ...ignoreList,
    '',
    '# common secrets',
    '.env*',
    '*.pem',
    '*.key',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# npm',
    'package-lock.json',
    'node_modules/',
  ].join('\n') + '\n';
}

export function matchesIgnore(filePath, ignoreList) {
  return ignoreList.some((pattern) => {
    if (pattern.endsWith('/')) {
      return filePath.startsWith(pattern) || filePath.includes('/' + pattern);
    }
    if (pattern.includes('*')) {
      const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return re.test(path.basename(filePath));
    }
    return filePath === pattern || filePath.endsWith('/' + pattern);
  });
}

export function collectBrainFiles(brainPath, ignoreList) {
  const base = path.resolve(brainPath === '.' ? process.cwd() : brainPath);
  const results = [];
  const walk = (dir, rel = '') => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const relPath = rel ? rel + '/' + e.name : e.name;
      if (matchesIgnore(relPath, ignoreList)) continue;
      if (e.name === '.git') continue;
      if (e.name === 'node_modules') continue;
      if (e.name === MANIFEST) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), relPath);
      else results.push(relPath);
    }
  };
  walk(base);
  return results;
}
