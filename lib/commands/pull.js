import { readManifest } from '../manifest.js';
import { git, gitOk, hasRemote } from '../git.js';
import { ok, die } from '../utils.js';

export function cmdPull() {
  readManifest();
  if (!gitOk()) die('Not a git repository.');
  if (!hasRemote()) die('No remote configured.');

  git(['pull', '--rebase'], { check: true, stdio: 'inherit' });
  ok('Brain pulled from remote.');
}
