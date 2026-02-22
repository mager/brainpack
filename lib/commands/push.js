import chalk from 'chalk';
import { readManifest } from '../manifest.js';
import { git, gitOk, hasRemote } from '../git.js';
import { ok, info, warn, die } from '../utils.js';
import { nowStamp } from '../utils.js';

export function cmdPush(opts) {
  readManifest();
  if (!gitOk()) die('Not a git repository. Run brainpack init first.');

  const message = opts.message || `🧠 brain sync ${nowStamp()}`;

  git(['add', '-A'], { check: true });
  ok('Staged all files');

  const status = git(['status', '--porcelain'], { check: false });
  if (!status.stdout.trim()) {
    info('Nothing to commit — brain is up to date.');
  } else {
    git(['commit', '-m', message], { check: true });
    ok(`Committed: ${chalk.dim(message)}`);
  }

  if (!hasRemote()) {
    warn('No remote configured. Skipping push.');
    info(`Add one: ${chalk.dim('git remote add origin <url>')}`);
    return;
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { check: false }).stdout.trim() || 'main';
  git(['push', '-u', 'origin', branch], { check: true, stdio: 'inherit' });
  ok(`Pushed to origin/${branch}`);
}
