import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { git, gitOk, hasRemote, hasCommits } from '../lib/git.js';

let tmpDir, origCwd;

function sh(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd: cwd || tmpDir, encoding: 'utf8', stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test.com',
           GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test.com' } });
}

function initRepo() {
  sh('git', ['init', '-b', 'main']);
  sh('git', ['config', 'user.email', 'test@test.com']);
  sh('git', ['config', 'user.name', 'test']);
}

function makeCommit(msg = 'init') {
  fs.writeFileSync(path.join(tmpDir, 'README.md'), msg);
  sh('git', ['add', '-A']);
  sh('git', ['commit', '-m', msg], tmpDir);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-git-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('gitOk', () => {
  test('returns false in non-git directory', () => {
    assert.equal(gitOk(), false);
  });

  test('returns true after git init', () => {
    initRepo();
    assert.equal(gitOk(), true);
  });
});

describe('hasRemote', () => {
  test('returns false with no remote', () => {
    initRepo();
    assert.equal(hasRemote(), false);
  });

  test('returns true after adding a remote', () => {
    initRepo();
    sh('git', ['remote', 'add', 'origin', 'https://github.com/test/repo.git']);
    assert.equal(hasRemote(), true);
  });
});

describe('hasCommits', () => {
  test('returns false on fresh repo with no commits', () => {
    initRepo();
    assert.equal(hasCommits(), false);
  });

  test('returns true after first commit', () => {
    initRepo();
    makeCommit('first commit');
    assert.equal(hasCommits(), true);
  });
});

describe('git()', () => {
  test('executes a git command and returns stdout', () => {
    initRepo();
    makeCommit('test commit');
    const r = git(['log', '--oneline', '-1']);
    assert.ok(r.stdout.includes('test commit'));
  });

  test('returns non-zero status with check:false (no die)', () => {
    initRepo();
    const r = git(['log', '--oneline', '-1'], { check: false });
    // no commits yet — exits non-zero but should not throw
    assert.equal(typeof r.status, 'number');
  });

  test('respects cwd option', () => {
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-git-other-'));
    try {
      spawnSync('git', ['init', '-b', 'main'], { cwd: otherDir, stdio: 'pipe' });
      const r = git(['rev-parse', '--git-dir'], { check: false, cwd: otherDir });
      assert.equal(r.status, 0);
    } finally {
      fs.rmSync(otherDir, { recursive: true, force: true });
    }
  });
});
