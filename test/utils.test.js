import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { nowStamp, dateStamp, log, ok, info, warn, err, die } from '../lib/utils.js';

describe('nowStamp', () => {
  test('returns YYYY-MM-DD HH:MM format', () => {
    const s = nowStamp();
    assert.match(s, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test('year is plausible', () => {
    const year = parseInt(nowStamp().slice(0, 4), 10);
    assert.ok(year >= 2024 && year <= 2100);
  });
});

describe('dateStamp', () => {
  test('returns YYYY-MM-DD format', () => {
    const s = dateStamp();
    assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches date portion of nowStamp', () => {
    const now = nowStamp();
    const date = dateStamp();
    assert.equal(date, now.slice(0, 10));
  });
});

describe('console output helpers', () => {
  test('log calls console.log', () => {
    const calls = [];
    mock.method(console, 'log', (msg) => calls.push(msg));
    log('hello');
    console.log.mock.restore();
    assert.ok(calls.some((c) => c === 'hello'));
  });

  test('ok prints green checkmark', () => {
    const calls = [];
    mock.method(console, 'log', (msg) => calls.push(msg));
    ok('all good');
    console.log.mock.restore();
    assert.ok(calls.some((c) => c.includes('all good')));
  });

  test('info prints message', () => {
    const calls = [];
    mock.method(console, 'log', (msg) => calls.push(msg));
    info('fyi');
    console.log.mock.restore();
    assert.ok(calls.some((c) => c.includes('fyi')));
  });

  test('warn prints message', () => {
    const calls = [];
    mock.method(console, 'log', (msg) => calls.push(msg));
    warn('heads up');
    console.log.mock.restore();
    assert.ok(calls.some((c) => c.includes('heads up')));
  });

  test('err calls console.error', () => {
    const calls = [];
    mock.method(console, 'error', (msg) => calls.push(msg));
    err('broken');
    console.error.mock.restore();
    assert.ok(calls.some((c) => c.includes('broken')));
  });
});

describe('die', () => {
  test('calls process.exit(1)', () => {
    let exitCode;
    mock.method(process, 'exit', (code) => { exitCode = code; throw new Error('exit'); });
    mock.method(console, 'error', () => {});
    try { die('fatal'); } catch {}
    process.exit.mock.restore();
    console.error.mock.restore();
    assert.equal(exitCode, 1);
  });
});
