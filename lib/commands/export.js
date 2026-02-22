import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as tar from 'tar';
import { readManifest, MANIFEST } from '../manifest.js';
import { collectBrainFiles } from '../files.js';
import { info, ok, die } from '../utils.js';
import { dateStamp } from '../utils.js';

export async function cmdExport(file) {
  const manifest = readManifest();
  const cwd = process.cwd();
  const outFile = file || `brainpack-export-${dateStamp()}.tar.gz`;
  const files = collectBrainFiles(manifest.brainPath, manifest.ignore);
  const toInclude = [MANIFEST, ...files.filter((f) => f !== MANIFEST)];

  if (toInclude.length === 0) die('No files to export.');

  info(`Exporting ${toInclude.length} file(s) → ${chalk.bold(outFile)}`);

  await tar.create(
    { gzip: true, file: path.resolve(outFile), cwd },
    toInclude.filter((f) => fs.existsSync(path.join(cwd, f)))
  );

  const size = (fs.statSync(outFile).size / 1024).toFixed(1);
  ok(`Exported: ${chalk.bold(outFile)} (${size} KB)`);
}
