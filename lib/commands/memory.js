import fs from 'fs';
import path from 'path';
import { resolveBrainPath } from '../files.js';
import { readManifest } from '../manifest.js';
import { info, ok } from '../utils.js';

export function cmdMemory(file) {
  const base = resolveBrainPath(readManifest().brainPath);
  if (!fs.statSync(base, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('Create the brainPath folder before saving memory.');
  }
  const target = path.join(base, 'MEMORY.md');
  const existing = fs.lstatSync(target, { throwIfNoEntry: false });
  if (existing && !existing.isFile()) throw new Error('MEMORY.md must be a regular file.');
  if (file === '-' && process.stdin.isTTY) throw new Error('Pipe Markdown into memory - or supply a file.');

  const input = fs.readFileSync(file === '-' ? 0 : file);
  let markdown;
  try {
    markdown = new TextDecoder('utf-8', { fatal: true }).decode(input);
  } catch {
    throw new Error('Memory input must be UTF-8 Markdown.');
  }
  if (!markdown.trim() || markdown.includes('\0')) throw new Error('Supply non-empty Markdown text.');
  if (existing && input.equals(fs.readFileSync(target))) {
    info('MEMORY.md is already up to date.');
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(base, '.brainpack-memory-'));
  try {
    const next = path.join(tempDir, 'MEMORY.md');
    fs.writeFileSync(next, input, { mode: 0o600 });
    fs.renameSync(next, target);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ok(`Saved ${path.relative(process.cwd(), target)}. Review the diff before you commit.`);
}
