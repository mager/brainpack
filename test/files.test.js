import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { matchesIgnore, buildGitignore, collectBrainFiles, DEFAULT_IGNORE } from '../lib/files.js';

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir;

function write(relPath, content = '') {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

// ── matchesIgnore ─────────────────────────────────────────────────────────────

describe('matchesIgnore', () => {
  test('exact filename match', () => {
    assert.ok(matchesIgnore('TOOLS.md', ['TOOLS.md']));
  });

  test('no match for different file', () => {
    assert.ok(!matchesIgnore('README.md', ['TOOLS.md']));
  });

  test('directory prefix match (trailing slash)', () => {
    assert.ok(matchesIgnore('.openclaw/some/file.json', ['.openclaw/']));
  });

  test('glob wildcard *.key', () => {
    assert.ok(matchesIgnore('secret.key', ['*.key']));
    assert.ok(!matchesIgnore('secret.pem', ['*.key']));
  });

  test('glob wildcard .env*', () => {
    assert.ok(matchesIgnore('.env', ['.env*']));
    assert.ok(matchesIgnore('.env.local', ['.env*']));
    assert.ok(!matchesIgnore('env.txt', ['.env*']));
  });

  test('empty ignore list never matches', () => {
    assert.ok(!matchesIgnore('anything.md', []));
  });

  test('nested path with directory pattern', () => {
    assert.ok(matchesIgnore('node_modules/chalk/index.js', ['node_modules/']));
  });
});

// ── buildGitignore ────────────────────────────────────────────────────────────

describe('buildGitignore', () => {
  test('includes all provided patterns', () => {
    const content = buildGitignore(['TOOLS.md', '.env', '.openclaw/']);
    assert.ok(content.includes('TOOLS.md'));
    assert.ok(content.includes('.env'));
    assert.ok(content.includes('.openclaw/'));
  });

  test('always includes node_modules and .DS_Store', () => {
    const content = buildGitignore([]);
    assert.ok(content.includes('node_modules/'));
    assert.ok(content.includes('.DS_Store'));
  });

  test('ends with newline', () => {
    const content = buildGitignore([]);
    assert.ok(content.endsWith('\n'));
  });
});

// ── DEFAULT_IGNORE ────────────────────────────────────────────────────────────

describe('DEFAULT_IGNORE', () => {
  test('always ignores .env', () => {
    assert.ok(DEFAULT_IGNORE.includes('.env') || DEFAULT_IGNORE.some(p => p.includes('.env')));
  });

  test('always ignores node_modules', () => {
    assert.ok(DEFAULT_IGNORE.some(p => p.includes('node_modules')));
  });
});

// ── collectBrainFiles ─────────────────────────────────────────────────────────

describe('collectBrainFiles', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-files-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('collects plain files', () => {
    write('SOUL.md', 'soul');
    write('README.md', 'readme');
    const files = collectBrainFiles(tmpDir, []);
    assert.ok(files.includes('SOUL.md'));
    assert.ok(files.includes('README.md'));
  });

  test('skips .git directory', () => {
    write('.git/HEAD', 'ref: refs/heads/main');
    write('SOUL.md', 'soul');
    const files = collectBrainFiles(tmpDir, []);
    assert.ok(!files.some(f => f.startsWith('.git')));
    assert.ok(files.includes('SOUL.md'));
  });

  test('skips node_modules', () => {
    write('node_modules/chalk/index.js', '');
    write('SOUL.md', 'soul');
    const files = collectBrainFiles(tmpDir, []);
    assert.ok(!files.some(f => f.startsWith('node_modules')));
  });

  test('skips brainpack.json (manifest)', () => {
    write('brainpack.json', '{}');
    write('SOUL.md', 'soul');
    const files = collectBrainFiles(tmpDir, []);
    assert.ok(!files.includes('brainpack.json'));
    assert.ok(files.includes('SOUL.md'));
  });

  test('respects ignoreList', () => {
    write('TOOLS.md', 'tools');
    write('SOUL.md', 'soul');
    const files = collectBrainFiles(tmpDir, ['TOOLS.md']);
    assert.ok(!files.includes('TOOLS.md'));
    assert.ok(files.includes('SOUL.md'));
  });

  test('collects nested files', () => {
    write('memory/2026-02-23.md', 'notes');
    write('memory/deep/nested.md', 'deep');
    const files = collectBrainFiles(tmpDir, []);
    assert.ok(files.includes('memory/2026-02-23.md'));
    assert.ok(files.includes('memory/deep/nested.md'));
  });

  test('empty dir returns empty array', () => {
    const files = collectBrainFiles(tmpDir, []);
    assert.deepEqual(files, []);
  });
});
