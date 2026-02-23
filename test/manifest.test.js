import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readManifest, writeManifest } from '../lib/manifest.js';

let tmpDir, origCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-manifest-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readManifest', () => {
  test('calls process.exit(1) when brainpack.json is missing', () => {
    let exitCode;
    mock.method(process, 'exit', (c) => { exitCode = c; throw new Error('exit'); });
    mock.method(console, 'error', () => {});
    try { readManifest(); } catch {}
    process.exit.mock.restore();
    console.error.mock.restore();
    assert.equal(exitCode, 1);
  });

  test('returns parsed manifest when file exists', () => {
    const data = { name: 'my-brain', version: '1.0.0', platform: 'openclaw' };
    fs.writeFileSync('brainpack.json', JSON.stringify(data));
    assert.deepEqual(readManifest(), data);
  });

  test('returns nested objects correctly', () => {
    const data = { name: 'x', ignore: ['TOOLS.md', '.env'], platform: 'cursor' };
    fs.writeFileSync('brainpack.json', JSON.stringify(data));
    const result = readManifest();
    assert.deepEqual(result.ignore, ['TOOLS.md', '.env']);
  });
});

describe('writeManifest', () => {
  test('creates brainpack.json', () => {
    writeManifest({ name: 'test' });
    assert.ok(fs.existsSync('brainpack.json'));
  });

  test('writes valid JSON', () => {
    const data = { name: 'test', platform: 'openclaw' };
    writeManifest(data);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync('brainpack.json', 'utf8')));
  });

  test('round-trips through readManifest', () => {
    const data = { name: 'roundtrip', version: '2.0.0', platform: 'cursor', ignore: ['.env'] };
    writeManifest(data);
    assert.deepEqual(readManifest(), data);
  });

  test('output is pretty-printed (indented)', () => {
    writeManifest({ name: 'pretty' });
    const content = fs.readFileSync('brainpack.json', 'utf8');
    assert.ok(content.includes('\n  '));
  });

  test('output ends with newline', () => {
    writeManifest({ name: 'nl' });
    const content = fs.readFileSync('brainpack.json', 'utf8');
    assert.ok(content.endsWith('\n'));
  });

  test('overwrites existing manifest', () => {
    writeManifest({ name: 'first' });
    writeManifest({ name: 'second' });
    assert.equal(readManifest().name, 'second');
  });
});
