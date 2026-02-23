import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectPlatform, PLATFORM_IGNORE } from '../lib/platform.js';

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir;

function touch(...parts) {
  const full = path.join(tmpDir, ...parts);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, '');
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('detectPlatform', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns generic for empty dir', () => {
    assert.equal(detectPlatform(tmpDir), 'generic');
  });

  test('detects cursor via .cursor dir', () => {
    touch('.cursor', '.keep');
    assert.equal(detectPlatform(tmpDir), 'cursor');
  });

  test('detects cursor via .cursorrules', () => {
    touch('.cursorrules');
    assert.equal(detectPlatform(tmpDir), 'cursor');
  });

  test('detects claude-code via .claude dir', () => {
    touch('.claude', '.keep');
    assert.equal(detectPlatform(tmpDir), 'claude-code');
  });

  test('detects claude-code via CLAUDE.md', () => {
    touch('CLAUDE.md');
    assert.equal(detectPlatform(tmpDir), 'claude-code');
  });

  test('detects windsurf via .windsurf dir', () => {
    touch('.windsurf', '.keep');
    assert.equal(detectPlatform(tmpDir), 'windsurf');
  });

  test('detects cline via .cline dir', () => {
    touch('.cline', '.keep');
    assert.equal(detectPlatform(tmpDir), 'cline');
  });

  test('detects openclaw via SOUL.md', () => {
    touch('SOUL.md');
    assert.equal(detectPlatform(tmpDir), 'openclaw');
  });

  test('detects openclaw via AGENTS.md', () => {
    touch('AGENTS.md');
    assert.equal(detectPlatform(tmpDir), 'openclaw');
  });

  test('detects aider via .aider.conf.yml', () => {
    touch('.aider.conf.yml');
    assert.equal(detectPlatform(tmpDir), 'aider');
  });

  test('detects replit via .replit', () => {
    touch('.replit');
    assert.equal(detectPlatform(tmpDir), 'replit');
  });

  test('detects copilot via .github/copilot-instructions.md', () => {
    touch('.github', 'copilot-instructions.md');
    assert.equal(detectPlatform(tmpDir), 'copilot');
  });

  test('cursor wins over openclaw when both present (cursor is checked first)', () => {
    touch('.cursorrules');
    touch('SOUL.md');
    assert.equal(detectPlatform(tmpDir), 'cursor');
  });

  test('brainpack.json platform field overrides file detection', () => {
    touch('SOUL.md');
    // write a manifest with a different platform
    fs.writeFileSync(
      path.join(tmpDir, 'brainpack.json'),
      JSON.stringify({ platform: 'cursor', name: 'test' })
    );
    assert.equal(detectPlatform(tmpDir), 'cursor');
  });

  test('PLATFORM_IGNORE includes known platforms', () => {
    const expected = ['openclaw', 'cursor', 'claude-code', 'generic'];
    for (const p of expected) {
      assert.ok(p in PLATFORM_IGNORE, `${p} missing from PLATFORM_IGNORE`);
    }
  });
});
