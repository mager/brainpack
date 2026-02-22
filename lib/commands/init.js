import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { MANIFEST, readManifest, writeManifest } from '../manifest.js';
import { detectPlatform, platformBrainPath, PLATFORM_IGNORE } from '../platform.js';
import { DEFAULT_IGNORE, buildGitignore } from '../files.js';
import { git, gitOk } from '../git.js';
import { log, ok, info, warn } from '../utils.js';

export function cmdInit(opts) {
  const cwd = process.cwd();
  const name = opts.name || path.basename(cwd);
  const platform = opts.platform || detectPlatform(cwd);
  const brainPath = platformBrainPath(platform);

  info(`Detected platform: ${chalk.bold(platform)}`);

  if (fs.existsSync(MANIFEST)) {
    warn(`${MANIFEST} already exists — skipping manifest creation.`);
  } else {
    const platformIgnore = PLATFORM_IGNORE[platform] || [];
    const ignore = [...new Set([...DEFAULT_IGNORE, ...platformIgnore])];
    const manifest = {
      name,
      version: '1.0.0',
      platform,
      brainPath,
      ignore,
      created: new Date().toISOString(),
    };
    writeManifest(manifest);
    ok(`Created ${MANIFEST}`);
  }

  const manifest = readManifest();

  if (!fs.existsSync('.gitignore')) {
    fs.writeFileSync('.gitignore', buildGitignore(manifest.ignore));
    ok('Created .gitignore');
  } else {
    info('.gitignore already exists — skipping.');
  }

  if (!gitOk()) {
    git(['init'], { check: true, stdio: 'pipe' });
    ok('Initialized git repository');
  } else {
    info('Git already initialized.');
  }

  log('');
  log(chalk.bold(`🧠 Brainpack "${name}" initialized!`));
  log(`   Platform : ${chalk.cyan(platform)}`);
  log(`   Brain    : ${chalk.cyan(brainPath)}`);
  log('');
  log(`Next: add a remote and run ${chalk.bold('brainpack push')}`);
}
