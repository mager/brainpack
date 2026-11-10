import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as tar from 'tar';
import { readManifest, MANIFEST } from '../manifest.js';
import { collectBrainFiles, COMMON_SECRET_IGNORE, matchesIgnore, resolveBrainPath } from '../files.js';
import { dateStamp, info, log, ok } from '../utils.js';

export async function cmdExport(file, opts = {}) {
  const manifest = readManifest();
  const cwd = fs.realpathSync(process.cwd());
  const outFile = file || `brainpack-export-${dateStamp()}.tar.gz`;
  const requestedPath = path.resolve(cwd, outFile);
  const output = path.join(fs.realpathSync(path.dirname(requestedPath)), path.basename(requestedPath));
  const manifestPath = path.join(cwd, MANIFEST);
  if (!fs.lstatSync(manifestPath).isFile()) throw new Error('brainpack.json must be a regular file.');
  if (output === manifestPath) throw new Error('Choose an archive path other than brainpack.json.');
  const base = resolveBrainPath(manifest.brainPath, cwd);
  const ignore = [...(manifest.ignore || []), ...COMMON_SECRET_IGNORE, 'brainpack-export-*.tar.gz'];
  const files = collectBrainFiles(base, ignore)
    .filter(f => path.join(base, f) !== output)
    .map(f => path.relative(cwd, path.join(base, f)).split(path.sep).join('/'))
    .filter(f => !matchesIgnore(f, ignore))
    .sort();
  const toInclude = [MANIFEST, ...files];

  if (opts.list) {
    for (const entry of toInclude) log(entry);
    return;
  }

  info(`Exporting ${toInclude.length} file(s) → ${chalk.bold(outFile)}`);

  const tempDir = fs.mkdtempSync(path.join(path.dirname(output), '.brainpack-export-'));
  try {
    const archive = path.join(tempDir, 'archive.tar.gz');
    await tar.create({ gzip: true, file: archive, cwd, strict: true, mode: 0o600 }, toInclude.map(f => `./${f}`));
    fs.renameSync(archive, output);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const size = (fs.statSync(outFile).size / 1024).toFixed(1);
  ok(`Exported: ${chalk.bold(outFile)} (${size} KB)`);
}
