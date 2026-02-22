import { spawnSync } from 'child_process';
import { die } from './utils.js';

export function git(args, opts = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    cwd: opts.cwd || process.cwd(),
    stdio: opts.stdio || 'pipe',
  });
  if (opts.check !== false && result.status !== 0) {
    die(`git ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

export function gitOk() {
  const r = spawnSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8', stdio: 'pipe' });
  return r.status === 0;
}

export function hasRemote() {
  const r = spawnSync('git', ['remote'], { encoding: 'utf8', stdio: 'pipe' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

export function hasCommits() {
  const r = spawnSync('git', ['log', '--oneline', '-1'], { encoding: 'utf8', stdio: 'pipe' });
  return r.status === 0 && r.stdout.trim().length > 0;
}
