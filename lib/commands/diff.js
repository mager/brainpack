import chalk from 'chalk';
import { readManifest } from '../manifest.js';
import { git, gitOk, hasCommits } from '../git.js';
import { log, info, die } from '../utils.js';

export function cmdDiff() {
  readManifest();
  if (!gitOk()) die('Not a git repository.');

  log(chalk.bold('─── Staged & unstaged changes ──────────────────────'));
  if (!hasCommits()) {
    info('No commits yet — all files are untracked.');
  } else {
    const diff = git(['diff', 'HEAD'], { check: false });
    if (diff.stdout.trim()) {
      log(diff.stdout);
    } else {
      info('No staged/unstaged changes.');
    }
  }

  log(chalk.bold('─── Untracked files ─────────────────────────────────'));
  const untracked = git(['ls-files', '--others', '--exclude-standard'], { check: false });
  const files = untracked.stdout.trim().split('\n').filter(Boolean);
  if (files.length === 0) {
    info('No untracked files.');
  } else {
    files.forEach((f) => log(`  ${chalk.yellow('?')} ${f}`));
    log('');
    log(`  ${chalk.dim(files.length + ' untracked file(s)')}`);
  }
}
