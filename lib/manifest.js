import fs from 'fs';
import chalk from 'chalk';
import { die } from './utils.js';

export const MANIFEST = 'brainpack.json';

export function readManifest() {
  if (!fs.existsSync(MANIFEST)) {
    die(`No brainpack.json found. Run ${chalk.bold('brainpack init')} first.`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

export function writeManifest(data) {
  fs.writeFileSync(MANIFEST, JSON.stringify(data, null, 2) + '\n');
}
