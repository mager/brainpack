import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as tar from 'tar';
import readline from 'readline';
import { readManifest } from '../manifest.js';
import { info, ok, warn, die } from '../utils.js';

async function confirmOverwrite(file) {
  if (!fs.existsSync(file)) return true;
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${chalk.yellow('⚠')} ${file} exists. Overwrite? [y/N] `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}

export async function cmdImport(file, opts) {
  const absFile = path.resolve(file);
  if (!fs.existsSync(absFile)) die(`File not found: ${file}`);

  const cwd = process.cwd();
  info(`Importing from ${chalk.bold(file)}...`);

  if (!opts.force) {
    // List files in archive and check for conflicts
    const entries = [];
    await tar.list({
      file: absFile,
      onentry: (entry) => entries.push(entry.path),
    });

    const conflicts = entries.filter((e) => fs.existsSync(path.join(cwd, e)));
    if (conflicts.length > 0) {
      warn(`${conflicts.length} file(s) already exist:`);
      conflicts.forEach((f) => console.log(`  ${chalk.yellow('?')} ${f}`));
      console.log('');
      const confirmed = await confirmOverwrite('these files');
      if (!confirmed) {
        info('Aborted. Use --force to skip this prompt.');
        process.exit(0);
      }
    }
  }

  await tar.extract({ file: absFile, cwd });

  ok(`Brain imported from ${chalk.bold(file)}`);
  try {
    const m = readManifest();
    info(`Brain: ${chalk.bold(m.name)} (${m.platform})`);
  } catch { /* manifest may not exist */ }
}
