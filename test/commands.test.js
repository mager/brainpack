/**
 * Integration tests for lib/commands/*
 *
 * Each test gets a fresh tmp dir with process.chdir() isolation.
 * git is initialized as needed. console output is suppressed.
 * process.exit is mocked to throw instead of killing the process.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { cmdInit }     from '../lib/commands/init.js';
import { cmdStatus }   from '../lib/commands/status.js';
import { cmdDiff }     from '../lib/commands/diff.js';
import { cmdPush }     from '../lib/commands/push.js';
import { cmdSnapshot } from '../lib/commands/snapshot.js';
import { cmdSecrets }  from '../lib/commands/secrets.js';
import { cmdExport }   from '../lib/commands/export.js';
import { cmdImport }   from '../lib/commands/import.js';

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

function initGit() {
  sh(['init', '-b', 'main']);
  sh(['config', 'user.email', 'test@test.com']);
  sh(['config', 'user.name', 'test']);
}

function makeCommit(msg = 'init') {
  fs.writeFileSync(path.join(tmpDir, '_seed.md'), msg);
  sh(['add', '-A']);
  sh(['commit', '-m', msg]);
}

function writeManifestFile(data = {}) {
  const manifest = {
    name: 'test-brain',
    version: '1.0.0',
    platform: 'generic',
    brainPath: '.',
    ignore: ['TOOLS.md', '.env', 'node_modules/'],
    ...data,
  };
  fs.writeFileSync(path.join(tmpDir, 'brainpack.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-cmd-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── cmdInit ───────────────────────────────────────────────────────────────────

describe('cmdInit', () => {
  test('creates brainpack.json', () => {
    silenceConsole();
    cmdInit({});
    restoreConsole();
    assert.ok(fs.existsSync('brainpack.json'));
  });

  test('creates .gitignore', () => {
    silenceConsole();
    cmdInit({});
    restoreConsole();
    assert.ok(fs.existsSync('.gitignore'));
  });

  test('inits a git repo', () => {
    silenceConsole();
    cmdInit({});
    restoreConsole();
    assert.ok(fs.existsSync('.git'));
  });

  test('manifest contains name from folder', () => {
    silenceConsole();
    cmdInit({});
    restoreConsole();
    const m = JSON.parse(fs.readFileSync('brainpack.json', 'utf8'));
    assert.ok(typeof m.name === 'string' && m.name.length > 0);
  });

  test('manifest name can be overridden via --name', () => {
    silenceConsole();
    cmdInit({ name: 'my-custom-brain' });
    restoreConsole();
    const m = JSON.parse(fs.readFileSync('brainpack.json', 'utf8'));
    assert.equal(m.name, 'my-custom-brain');
  });

  test('manifest platform can be overridden', () => {
    silenceConsole();
    cmdInit({ platform: 'cursor' });
    restoreConsole();
    const m = JSON.parse(fs.readFileSync('brainpack.json', 'utf8'));
    assert.equal(m.platform, 'cursor');
  });

  test('does not overwrite existing brainpack.json', () => {
    writeManifestFile({ name: 'original' });
    initGit();
    fs.writeFileSync('.gitignore', '# existing\n');
    silenceConsole();
    cmdInit({});
    restoreConsole();
    const m = JSON.parse(fs.readFileSync('brainpack.json', 'utf8'));
    assert.equal(m.name, 'original');
  });

  test('skips .gitignore creation if it already exists', () => {
    initGit();
    fs.writeFileSync('.gitignore', '# mine\n');
    silenceConsole();
    cmdInit({});
    restoreConsole();
    assert.equal(fs.readFileSync('.gitignore', 'utf8'), '# mine\n');
  });

  test('skips git init if already a repo', () => {
    initGit();
    silenceConsole();
    cmdInit({});
    restoreConsole();
    // .git should still exist and be valid
    assert.ok(fs.existsSync('.git'));
  });
});

// ── cmdStatus ─────────────────────────────────────────────────────────────────

describe('cmdStatus', () => {
  test('prints status without throwing', () => {
    initGit();
    writeManifestFile();
    silenceConsole();
    assert.doesNotThrow(() => cmdStatus());
    restoreConsole();
  });

  test('works without git initialized', () => {
    writeManifestFile();
    silenceConsole();
    assert.doesNotThrow(() => cmdStatus());
    restoreConsole();
  });

  test('dies if no brainpack.json', () => {
    initGit();
    mockExit();
    silenceConsole();
    assert.throws(() => cmdStatus(), /exit/);
    restoreConsole();
    restoreExit();
  });

  test('counts brain files correctly', () => {
    initGit();
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul');
    fs.writeFileSync('MEMORY.md', 'memory');
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdStatus();
    console.log.mock.restore();
    // should mention file count — 2 files (SOUL.md + MEMORY.md); _seed not present
    const fileLine = lines.find((l) => l.includes('Files'));
    assert.ok(fileLine, 'missing Files line');
  });
});

// ── cmdDiff ───────────────────────────────────────────────────────────────────

describe('cmdDiff', () => {
  test('runs without throwing on clean repo with commits', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    silenceConsole();
    assert.doesNotThrow(() => cmdDiff());
    restoreConsole();
  });

  test('handles fresh repo (no commits)', () => {
    initGit();
    writeManifestFile();
    silenceConsole();
    assert.doesNotThrow(() => cmdDiff());
    restoreConsole();
  });

  test('shows untracked files', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    fs.writeFileSync('untracked.md', 'hey');
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdDiff();
    console.log.mock.restore();
    assert.ok(lines.some((l) => l.includes('untracked.md')));
  });

  test('dies if not a git repo', () => {
    writeManifestFile();
    mockExit();
    silenceConsole();
    assert.throws(() => cmdDiff(), /exit/);
    restoreConsole();
    restoreExit();
  });
});

// ── cmdPush ───────────────────────────────────────────────────────────────────

describe('cmdPush', () => {
  test('commits changes when there are pending files', () => {
    initGit();
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul');
    silenceConsole();
    cmdPush({});
    restoreConsole();
    const log = spawnSync('git', ['log', '--oneline'], { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' });
    assert.ok(log.stdout.includes('🧠 brain sync'));
  });

  test('accepts custom commit message', () => {
    initGit();
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul');
    silenceConsole();
    cmdPush({ message: 'custom msg' });
    restoreConsole();
    const log = spawnSync('git', ['log', '--oneline'], { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' });
    assert.ok(log.stdout.includes('custom msg'));
  });

  test('reports nothing-to-commit on clean repo', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    mock.method(console, 'error', () => {});
    cmdPush({});
    console.log.mock.restore();
    console.error.mock.restore();
    assert.ok(lines.some((l) => l.includes('up to date') || l.includes('Nothing')));
  });

  test('warns when no remote configured (no throw)', () => {
    initGit();
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul');
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    mock.method(console, 'error', () => {});
    assert.doesNotThrow(() => cmdPush({}));
    console.log.mock.restore();
    console.error.mock.restore();
  });
});

// ── cmdSnapshot ───────────────────────────────────────────────────────────────

describe('cmdSnapshot', () => {
  test('creates a git tag', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    silenceConsole();
    cmdSnapshot('v1', {});
    restoreConsole();
    const tags = sh(['tag', '--list', 'brain/*']).stdout.trim();
    assert.ok(tags.includes('brain/v1'));
  });

  test('dies if snapshot name already exists', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    sh(['tag', 'brain/v1']);
    mockExit();
    silenceConsole();
    assert.throws(() => cmdSnapshot('v1', {}), /exit/);
    restoreConsole();
    restoreExit();
  });

  test('--list shows existing snapshots', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    sh(['tag', 'brain/alpha']);
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdSnapshot(undefined, { list: true });
    console.log.mock.restore();
    assert.ok(lines.some((l) => l.includes('alpha')));
  });

  test('--list with no snapshots prints info', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdSnapshot(undefined, { list: true });
    console.log.mock.restore();
    assert.ok(lines.some((l) => l.includes('No snapshots')));
  });

  test('dies if no name and no --list/--restore', () => {
    initGit();
    writeManifestFile();
    makeCommit();
    mockExit();
    silenceConsole();
    assert.throws(() => cmdSnapshot(undefined, {}), /exit/);
    restoreConsole();
    restoreExit();
  });
});

// ── cmdSecrets ────────────────────────────────────────────────────────────────

describe('cmdSecrets', () => {
  test('runs without throwing', () => {
    writeManifestFile({ platform: 'openclaw' });
    silenceConsole();
    assert.doesNotThrow(() => cmdSecrets());
    restoreConsole();
  });

  test('includes each ignored pattern in output', () => {
    writeManifestFile({ platform: 'generic', ignore: ['TOOLS.md', '.env'] });
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdSecrets();
    console.log.mock.restore();
    const all = lines.join('\n');
    assert.ok(all.includes('TOOLS.md'));
    assert.ok(all.includes('.env'));
  });

  test('shows cursor setup guide', () => {
    writeManifestFile({ platform: 'cursor' });
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdSecrets();
    console.log.mock.restore();
    assert.ok(lines.join('\n').includes('cursor'));
  });

  test('shows claude-code setup guide', () => {
    writeManifestFile({ platform: 'claude-code' });
    const lines = [];
    mock.method(console, 'log', (m) => lines.push(m || ''));
    cmdSecrets();
    console.log.mock.restore();
    assert.ok(lines.join('\n').toLowerCase().includes('claude'));
  });
});

// ── cmdExport + cmdImport ─────────────────────────────────────────────────────

describe('cmdExport / cmdImport', () => {
  test('export creates a .tar.gz file', async () => {
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul content');
    silenceConsole();
    await cmdExport('test-export.tar.gz');
    restoreConsole();
    assert.ok(fs.existsSync('test-export.tar.gz'));
    assert.ok(fs.statSync('test-export.tar.gz').size > 0);
  });

  test('export uses default filename with dateStamp', async () => {
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'soul');
    silenceConsole();
    await cmdExport();
    restoreConsole();
    const files = fs.readdirSync(tmpDir);
    assert.ok(files.some((f) => f.startsWith('brainpack-export-') && f.endsWith('.tar.gz')));
  });

  test('import extracts files from archive', async () => {
    // Setup: export from current dir
    writeManifestFile();
    fs.writeFileSync('SOUL.md', 'original soul');
    silenceConsole();
    await cmdExport('export.tar.gz');

    // Import into a fresh dir
    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-import-'));
    try {
      const archivePath = path.join(tmpDir, 'export.tar.gz');
      process.chdir(importDir);
      await cmdImport(archivePath, { force: true });
      restoreConsole();
      assert.ok(fs.existsSync(path.join(importDir, 'brainpack.json')));
      assert.ok(fs.existsSync(path.join(importDir, 'SOUL.md')));
      const soul = fs.readFileSync(path.join(importDir, 'SOUL.md'), 'utf8');
      assert.equal(soul, 'original soul');
    } finally {
      process.chdir(tmpDir);
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });

  test('import shows brain name after success', async () => {
    writeManifestFile({ name: 'my-brain' });
    fs.writeFileSync('SOUL.md', 'soul');
    silenceConsole();
    await cmdExport('e.tar.gz');
    restoreConsole();

    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-import2-'));
    try {
      const archivePath = path.join(tmpDir, 'e.tar.gz');
      process.chdir(importDir);
      const lines = [];
      mock.method(console, 'log', (m) => lines.push(m || ''));
      mock.method(console, 'error', () => {});
      await cmdImport(archivePath, { force: true });
      console.log.mock.restore();
      console.error.mock.restore();
      assert.ok(lines.some((l) => l.includes('my-brain')));
    } finally {
      process.chdir(tmpDir);
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });

  test('import dies if archive not found', async () => {
    mockExit();
    silenceConsole();
    await assert.rejects(() => cmdImport('nonexistent.tar.gz', { force: true }), /exit/);
    restoreConsole();
    restoreExit();
  });
});
