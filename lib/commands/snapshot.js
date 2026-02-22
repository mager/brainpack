import chalk from 'chalk';
import { readManifest } from '../manifest.js';
import { git, gitOk, hasRemote } from '../git.js';
import { log, ok, info, die } from '../utils.js';

export function cmdSnapshot(name, opts) {
  readManifest();
  if (!gitOk()) die('Not a git repository.');

  if (opts.list) {
    const r = git(['tag', '--list', 'brain/*', '--sort=-creatordate'], { check: false });
    const tags = r.stdout.trim();
    if (!tags) { info('No snapshots found.'); return; }
    log(chalk.bold('Snapshots:'));
    tags.split('\n').forEach((t) => log(`  ${chalk.cyan(t.replace('brain/', ''))}`));
    return;
  }

  if (opts.restore) {
    const tag = `brain/${opts.restore}`;
    const r = git(['tag', '--list', tag], { check: false });
    if (!r.stdout.trim()) die(`Snapshot "${opts.restore}" not found.`);
    git(['checkout', tag], { check: true, stdio: 'inherit' });
    ok(`Restored snapshot: ${chalk.bold(opts.restore)}`);
    return;
  }

  if (!name) die('Provide a snapshot name or use --list / --restore <name>');

  const tag = `brain/${name}`;
  const exists = git(['tag', '--list', tag], { check: false }).stdout.trim();
  if (exists) die(`Snapshot "${name}" already exists. Choose another name.`);

  git(['tag', tag], { check: true });
  ok(`Snapshot created: ${chalk.bold(name)} (tag: ${chalk.dim(tag)})`);

  if (hasRemote()) {
    git(['push', 'origin', tag], { check: false });
    ok('Pushed tag to remote.');
  }
}
