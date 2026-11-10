import fs from 'fs';
import path from 'path';
import { MANIFEST } from './manifest.js';

export const DEFAULT_IGNORE = ['TOOLS.md', '.env', '*.key', '.openclaw/', '.pi/', 'node_modules/'];
export const COMMON_SECRET_IGNORE = ['.env*', '*.pem', '*.key'];

export function buildGitignore(ignoreList) {
  return [
    '# brainpack ignore list',
    ...ignoreList,
    '',
    '# common secrets',
    ...COMMON_SECRET_IGNORE,
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
      const escaped = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const re = new RegExp('^' + escaped.join('.*') + '$');
      return re.test(path.basename(filePath));
    }
    return filePath === pattern || filePath.endsWith('/' + pattern);
  });
}

export function resolveBrainPath(brainPath, cwd = process.cwd()) {
  const root = fs.realpathSync(cwd);
  const base = path.resolve(root, brainPath);
  const relative = path.relative(root, base);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    || relative.split(path.sep).some(part => part.toLowerCase() === '.git')) {
    throw new Error('brainPath must point to a folder inside the pack, outside Git metadata.');
  }
  if (fs.existsSync(base) && fs.realpathSync(base) !== base) {
    throw new Error('brainPath must point to a folder without symbolic links in its path.');
  }
  return base;
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
      if (e.name.toLowerCase() === '.git') continue;
      if (e.name === 'node_modules') continue;
      if (e.name === MANIFEST) continue;
      if (e.isDirectory() && (e.name.startsWith('.brainpack-export-') || e.name.startsWith('.brainpack-memory-'))) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), relPath);
      else if (e.isFile()) results.push(relPath);
    }
  };
  walk(base);
  return results;
}
