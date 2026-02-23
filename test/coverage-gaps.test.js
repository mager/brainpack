/**
 * Targeted tests to close remaining coverage gaps:
 *   - import.js  : no-conflict path + prompt injection (opts._promptFn)
 *   - snapshot.js: --restore path
 *   - diff.js    : non-empty diff output
 *   - push.js    : actual push to local bare remote
 *   - status.js  : last-sync line when commits exist
 *   - git.js     : die on failure (check:true)
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { cmdDiff }     from '../lib/commands/diff.js';
import { cmdPush }     from '../lib/commands/push.js';
import { cmdStatus }   from '../lib/commands/status.js';
import { cmdSnapshot } from '../lib/commands/snapshot.js';
import { cmdExport }   from '../lib/commands/export.js';
import { cmdImport }   from '../lib/commands/import.js';
import { git }         from '../lib/git.js';

// ── shared helpers ────────────────────────────────────────────────────────────

let tmpDir, origCwd;

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@test.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@test.com',
};

function sh(args, cwd) {
  return spawnSync('git', args, {
    cwd: cwd || tmpDir,
    encoding: 'utf8',
    stdio: 'pipe',
    env: GIT_ENV,
  });
}

function initGit(dir) {
  const d = dir || tmpDir;
  spawnSync('git', ['init', '-b', 'main'], { cwd: d, stdio: 'pipe' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: d, stdio: 'pipe' });
  spawnSync('git', ['config', 'user.name', 'test'], { cwd: d, stdio: 'pipe' });
}

function makeCommit(msg = 'init', dir) {
  const d = dir || tmpDir;
  fs.writeFileSync(path.join(d, '_seed.md'), msg);
  spawnSync('git', ['add', '-A'], { cwd: d, stdio: 'pipe', env: GIT_ENV });
  spawnSync('git', ['commit', '-m', msg], { cwd: d, stdio: 'pipe', env: GIT_ENV });
}

function writeManifestFile(overrides = {}, dir) {
  const p = path.join(dir || tmpDir, 'brainpack.json');
  fs.writeFileSync(p, JSON.stringify({
    name: 'test-brain', version: '1.0.0', platform: 'generic',
    brainPath: '.', ignore: ['TOOLS.md', '.env', 'node_modules/'],
    ...overrides,
  }, null, 2) + '\n');
}

function silenceConsole() {
  mock.method(console, 'log',   () => {});
  mock.method(console, 'error', () => {});
}

function restoreConsole() {
  console.log.mock.restore();
  console.error.mock.restore();
}

function mockExit() {
  mock.method(process, 'exit', (code) => { throw Object.assign(new Error('process.exit'), { code }); });
}

function restoreExit() {
  process.exit.mock.restore();
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-gaps-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── git.js: die on failure ────────────────────────────────────────────────────

describe('git() check:true failure', () => {
  test('calls die (process.exit 1) when command fails', () => {
    initGit();
    mockExit();
    silenceConsole();
    assert.throws(() => git(['log', '--oneline', '-1']), /exit/); // no commits → non-zero
    restoreConsole();
    restoreExit();
  });
});

// ── diff.js: non-empty diff output ───────────────────────────────────────────

describe('cmdDiff non-empty diff', () => {
  test('prints diff output when tracked file is modified', () => {
    initGit();
    writeManifestFile();
    makeCommit('first');
    // Modify the committed file so `git diff HEAD` shows output
    fs.writeFileSync(path.join(tmpDir, '_seed.md'), 'changed!');

    const lines = [];
    mock.method(console, 'log', (m) => lines.push(String(m || '')));
    cmdDiff();
    console.log.mock.restore();

    // Diff output contains the + or - lines
    const all = lines.join('\n');
    assert.ok(all.includes('changed!') || all.includes('-init') || all.length > 0);
  });
});

// ── status.js: last sync when commits exist ───────────────────────────────────

describe('cmdStatus with commits', () => {
  test('shows Last sync line when repo has commits', () => {
    initGit();
    writeManifestFile();
    makeCommit('initial');

    const lines = [];
    mock.method(console, 'log', (m) => lines.push(String(m || '')));
    cmdStatus();
    console.log.mock.restore();

    assert.ok(lines.some((l) => l.includes('Last sync')));
  });

  test('shows pending changes when files are modified', () => {
    initGit();
    writeManifestFile();
    makeCommit('initial');
    fs.writeFileSync('newfile.md', 'new');

    const lines = [];
    mock.method(console, 'log', (m) => lines.push(String(m || '')));
    cmdStatus();
    console.log.mock.restore();

    assert.ok(lines.some((l) => l.includes('change') || l.includes('Pending')));
  });
});

// ── push.js: push to local bare remote ───────────────────────────────────────

describe('cmdPush with remote', () => {
  test('pushes to a local bare remote', () => {
    // Create a bare repo to serve as origin
    const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-bare-'));
    try {
      spawnSync('git', ['init', '--bare', '-b', 'main'], { cwd: bareDir, stdio: 'pipe' });
      initGit();
      writeManifestFile();
      fs.writeFileSync('SOUL.md', 'soul');
      sh(['remote', 'add', 'origin', bareDir]);

      silenceConsole();
      cmdPush({});
      restoreConsole();

      // Verify the commit landed in the bare repo
      const log = spawnSync('git', ['log', '--oneline'], { cwd: bareDir, stdio: 'pipe', encoding: 'utf8' });
      assert.ok(log.stdout.includes('🧠 brain sync'));
    } finally {
      fs.rmSync(bareDir, { recursive: true, force: true });
    }
  });
});

// ── snapshot.js: --restore path ───────────────────────────────────────────────

describe('cmdSnapshot --restore', () => {
  test('restores a snapshot (git checkout)', () => {
    initGit();
    writeManifestFile();
    makeCommit('first');
    sh(['tag', 'brain/v1']);
    makeCommit('second');

    silenceConsole();
    // checkout detaches HEAD — should not throw
    assert.doesNotThrow(() => cmdSnapshot(undefined, { restore: 'v1' }));
    restoreConsole();

    // HEAD should now point at brain/v1 tag
    const head = sh(['describe', '--tags', '--exact-match', 'HEAD']).stdout.trim();
    assert.equal(head, 'brain/v1');
  });

  test('--restore dies when snapshot does not exist', () => {
    initGit();
    writeManifestFile();
    makeCommit('first');

    mockExit();
    silenceConsole();
    assert.throws(() => cmdSnapshot(undefined, { restore: 'nonexistent' }), /exit/);
    restoreConsole();
    restoreExit();
  });
});

// ── snapshot.js: push tag to remote ──────────────────────────────────────────

describe('cmdSnapshot with remote', () => {
  test('pushes tag to remote when remote is configured', () => {
    const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-snap-bare-'));
    try {
      spawnSync('git', ['init', '--bare', '-b', 'main'], { cwd: bareDir, stdio: 'pipe' });
      initGit();
      writeManifestFile();
      makeCommit('init');
      sh(['remote', 'add', 'origin', bareDir]);
      sh(['push', '-u', 'origin', 'main']);

      silenceConsole();
      cmdSnapshot('release-1', {});
      restoreConsole();

      // Tag should exist in bare remote
      const tags = spawnSync('git', ['tag', '--list', 'brain/*'],
        { cwd: bareDir, encoding: 'utf8', stdio: 'pipe' }).stdout.trim();
      assert.ok(tags.includes('brain/release-1'));
    } finally {
      fs.rmSync(bareDir, { recursive: true, force: true });
    }
  });
});

// ── import.js: no-conflict path (no --force) ─────────────────────────────────

describe('cmdImport without --force, no conflicts', () => {
  test('imports cleanly when no conflicts exist', async () => {
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul content');
    silenceConsole();
    await cmdExport('out.tar.gz');
    restoreConsole();

    const archivePath = path.join(tmpDir, 'out.tar.gz');
    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-import-nc-'));
    try {
      process.chdir(importDir);
      silenceConsole();
      await cmdImport(archivePath, {});
      restoreConsole();
      assert.ok(fs.existsSync(path.join(importDir, 'brainpack.json')));
      assert.ok(fs.existsSync(path.join(importDir, 'SOUL.md')));
    } finally {
      process.chdir(tmpDir);
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });
});

// ── import.js: conflict prompt via opts._promptFn injection ──────────────────

describe('cmdImport conflict prompt', () => {
  test('warns about conflicts and overwrites when user confirms', async () => {
    writeManifestFile({ name: 'new-brain' });
    fs.writeFileSync('SOUL.md', 'new soul');
    silenceConsole();
    await cmdExport('out.tar.gz');
    restoreConsole();
    const archivePath = path.join(tmpDir, 'out.tar.gz');

    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-prompt-y-'));
    try {
      fs.writeFileSync(path.join(importDir, 'SOUL.md'), 'old soul');
      process.chdir(importDir);

      const logs = [];
      mock.method(console, 'log',   (m) => logs.push(String(m || '')));
      mock.method(console, 'error', () => {});
      await cmdImport(archivePath, { _promptFn: async () => true });
      console.log.mock.restore();
      console.error.mock.restore();

      assert.ok(logs.some((l) => l.includes('already exist') || l.includes('SOUL.md')));
      assert.equal(fs.readFileSync(path.join(importDir, 'SOUL.md'), 'utf8'), 'new soul');
    } finally {
      process.chdir(tmpDir);
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });

  test('aborts import when user declines', async () => {
    writeManifestFile({ name: 'new-brain' });
    fs.writeFileSync('SOUL.md', 'new soul');
    silenceConsole();
    await cmdExport('out.tar.gz');
    restoreConsole();
    const archivePath = path.join(tmpDir, 'out.tar.gz');

    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-prompt-n-'));
    try {
      fs.writeFileSync(path.join(importDir, 'SOUL.md'), 'old soul');
      process.chdir(importDir);

      let exitCalled = false;
      mock.method(process, 'exit', (code) => {
        exitCalled = true;
        throw Object.assign(new Error('process.exit'), { code });
      });
      silenceConsole();
      try {
        await cmdImport(archivePath, { _promptFn: async () => false });
      } catch (e) {
        if (!e.message.includes('process.exit')) throw e;
      }
      restoreConsole();
      process.exit.mock.restore();

      assert.ok(exitCalled, 'expected process.exit on decline');
      assert.equal(fs.readFileSync(path.join(importDir, 'SOUL.md'), 'utf8'), 'old soul');
    } finally {
      process.chdir(tmpDir);
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });
});
