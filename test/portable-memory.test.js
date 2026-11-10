import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import * as tar from 'tar';

const bin = fileURLToPath(new URL('../bin/brainpack.js', import.meta.url));

function setup(t, platform = 'generic') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brainpack-portable-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const pack = path.join(root, 'pack');
  fs.mkdirSync(pack);
  const cli = (args, opts) => execFileSync(process.execPath, [bin, ...args], {
    cwd: pack, encoding: 'utf8', ...opts,
  });
  const git = (...args) => execFileSync('git', args, { cwd: pack, encoding: 'utf8' }).trim();
  cli(['init', '--platform', platform]);
  return { root, pack, cli, git };
}

test('memory takes stdin or a file and leaves the last good copy after invalid input', t => {
  const { root, pack, cli } = setup(t);
  const target = path.join(pack, 'MEMORY.md');
  cli(['memory', '-'], { input: '# Accepted notes\nUse staging.\n' });
  const correction = '# Accepted notes\nUse sandbox.\n';
  const source = path.join(root, 'reviewed.md');
  fs.writeFileSync(source, correction);
  cli(['memory', source]);
  assert.equal(fs.readFileSync(target, 'utf8'), correction);
  const result = spawnSync(process.execPath, [bin, 'memory', '-'], { cwd: pack, input: ' \n' });
  assert.equal(result.status, 1);
  assert.equal(fs.readFileSync(target, 'utf8'), correction);
});

test('export preview matches the archive and restores nested brain paths', async t => {
  const { root, pack, cli } = setup(t, 'cursor');
  const rules = path.join(pack, '.cursor', 'rules');
  fs.mkdirSync(rules, { recursive: true });
  fs.writeFileSync(path.join(rules, 'deploy.mdc'), 'Use sandbox.');
  fs.writeFileSync(path.join(rules, '.env.local'), 'secret');
  fs.writeFileSync(path.join(rules, 'private.pem'), 'secret');
  fs.symlinkSync('private.pem', path.join(rules, 'alias.md'));
  fs.writeFileSync(path.join(rules, 'brainpack-export-2026-10-01.tar.gz'), 'old archive');
  fs.writeFileSync(path.join(rules, 'pack.tar.gz'), 'previous output');
  const output = '.cursor/rules/pack.tar.gz';
  const preview = cli(['export', output, '--list']).trim().split('\n');
  assert.deepEqual(preview, ['brainpack.json', '.cursor/rules/deploy.mdc']);
  assert.equal(fs.readFileSync(path.join(pack, output), 'utf8'), 'previous output');
  cli(['export', output]);
  const entries = [];
  await tar.list({ file: path.join(pack, output), onentry: e => entries.push(e.path.replace(/^\.\//, '')) });
  assert.deepEqual(entries, preview);
  const restored = path.join(root, 'restored');
  fs.mkdirSync(restored);
  cli(['import', path.join(pack, output)], { cwd: restored });
  assert.equal(fs.readFileSync(path.join(restored, '.cursor', 'rules', 'deploy.mdc'), 'utf8'), 'Use sandbox.');
});

test('local snapshots keep tags off the remote and show when changes are missing', t => {
  const { root, pack, cli, git } = setup(t);
  const remote = path.join(root, 'remote.git');
  git('init', '--bare', remote);
  git('remote', 'add', 'origin', remote);
  git('add', '.');
  git('-c', 'user.name=Brainpack Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Initialize pack');
  fs.writeFileSync(path.join(pack, 'MEMORY.md'), 'Pending correction');
  const output = cli(['snapshot', 'before-review', '--local']);
  assert.match(output, /uncommitted changes/i);
  assert.equal(git('tag', '--list'), 'brain/before-review');
  assert.equal(git('--git-dir', remote, 'tag', '--list'), '');
  assert.equal(git('status', '--porcelain'), '?? MEMORY.md');
});
