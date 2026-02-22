import chalk from 'chalk';
import { readManifest } from '../manifest.js';
import { git, gitOk } from '../git.js';
import { collectBrainFiles } from '../files.js';
import { log } from '../utils.js';

export function cmdStatus() {
  const manifest = readManifest();
  const isGit = gitOk();

  log('');
  log(chalk.bold('🧠 Brain Status'));
  log(chalk.dim('─'.repeat(40)));

  log(`  Name     : ${chalk.cyan(manifest.name)}`);
  log(`  Version  : ${manifest.version}`);
  log(`  Platform : ${chalk.cyan(manifest.platform)}`);
  log(`  Path     : ${manifest.brainPath}`);

  if (isGit) {
    const remoteR = git(['remote', 'get-url', 'origin'], { check: false });
    const remote = remoteR.status === 0 ? remoteR.stdout.trim() : chalk.dim('none');
    log(`  Remote   : ${remote}`);

    const logR = git(['log', '-1', '--format=%ci %s'], { check: false });
    if (logR.stdout.trim()) {
      log(`  Last sync: ${chalk.dim(logR.stdout.trim())}`);
    } else {
      log(`  Last sync: ${chalk.dim('no commits yet')}`);
    }

    const statusR = git(['status', '--porcelain'], { check: false });
    const lines = statusR.stdout.trim().split('\n').filter(Boolean);
    log(`  Pending  : ${lines.length === 0 ? chalk.green('clean') : chalk.yellow(lines.length + ' change(s)')}`);
  } else {
    log(`  Git      : ${chalk.dim('not initialized')}`);
  }

  const files = collectBrainFiles(manifest.brainPath, manifest.ignore);
  log(`  Files    : ${files.length}`);

  log(chalk.dim('─'.repeat(40)));
  log('');
}
