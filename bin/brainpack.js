#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as tar from 'tar';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

const MANIFEST = 'brainpack.json';
const DEFAULT_IGNORE = ['TOOLS.md', '.env', '*.key', '.openclaw/', '.pi/', 'node_modules/'];

// Platform-specific ignore additions
const PLATFORM_IGNORE = {
  openclaw: ['TOOLS.md', '.openclaw/', '.pi/', '.agents/'],
  cursor: ['.cursor/settings.json'],
  'claude-code': [],
  windsurf: [],
  cline: [],
  copilot: [],
  generic: [],
};

function log(msg) { console.log(msg); }
function ok(msg) { console.log(chalk.green('✓') + ' ' + msg); }
function info(msg) { console.log(chalk.cyan('ℹ') + ' ' + msg); }
function warn(msg) { console.log(chalk.yellow('⚠') + ' ' + msg); }
function err(msg) { console.error(chalk.red('✗') + ' ' + msg); }
function die(msg) { err(msg); process.exit(1); }

function readManifest() {
  const p = path.resolve(MANIFEST);
  if (!fs.existsSync(p)) die(`No brainpack.json found. Run ${chalk.bold('brainpack init')} first.`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeManifest(data) {
  fs.writeFileSync(MANIFEST, JSON.stringify(data, null, 2) + '\n');
}

function git(args, opts = {}) {
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

function gitOk() {
  const r = spawnSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8', stdio: 'pipe' });
  return r.status === 0;
}

function hasRemote() {
  const r = spawnSync('git', ['remote'], { encoding: 'utf8', stdio: 'pipe' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Platform detection ──────────────────────────────────────────────────────

function detectPlatform(dir = process.cwd()) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  if (has('SOUL.md') || has('AGENTS.md')) return 'openclaw';
  if (has('.cursor') || has('.cursor/rules')) return 'cursor';
  if (has('.claude') || has('CLAUDE.md')) return 'claude-code';
  if (has('.windsurf') || has('.windsurfrules')) return 'windsurf';
  if (has('.cline') || has('.clinerules')) return 'cline';
  if (has('.github/copilot-instructions.md')) return 'copilot';
  return 'generic';
}

function platformBrainPath(platform, dir = process.cwd()) {
  switch (platform) {
    case 'openclaw': return '.';
    case 'cursor': return '.cursor/rules';
    case 'claude-code': return '.';
    case 'windsurf': return '.';
    case 'cline': return '.';
    case 'copilot': return '.';
    default: return '.';
  }
}

// ─── Ignore helpers ──────────────────────────────────────────────────────────

function buildGitignore(ignoreList) {
  return [
    '# brainpack ignore list',
    ...ignoreList,
    '',
    '# common secrets',
    '.env*',
    '*.pem',
    '*.key',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
  ].join('\n') + '\n';
}

function matchesIgnore(filePath, ignoreList) {
  return ignoreList.some((pattern) => {
    if (pattern.endsWith('/')) {
      return filePath.startsWith(pattern) || filePath.includes('/' + pattern);
    }
    if (pattern.includes('*')) {
      const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return re.test(path.basename(filePath));
    }
    return filePath === pattern || filePath.endsWith('/' + pattern);
  });
}

function collectBrainFiles(brainPath, ignoreList) {
  const base = path.resolve(brainPath === '.' ? process.cwd() : brainPath);
  const results = [];
  const walk = (dir, rel = '') => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const relPath = rel ? rel + '/' + e.name : e.name;
      if (matchesIgnore(relPath, ignoreList)) continue;
      if (e.name === '.git') continue;
      if (e.name === 'node_modules') continue;
      if (e.name === MANIFEST) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), relPath);
      else results.push(relPath);
    }
  };
  walk(base);
  return results;
}

// ─── Commands ────────────────────────────────────────────────────────────────

// brainpack init
program
  .command('init')
  .description('Initialize current directory as a brainpack')
  .option('--name <name>', 'Brain name (default: folder name)')
  .option('--platform <platform>', 'Platform override (openclaw/cursor/claude-projects/generic)')
  .action((opts) => {
    const cwd = process.cwd();
    const name = opts.name || path.basename(cwd);
    const platform = opts.platform || detectPlatform(cwd);
    const brainPath = platformBrainPath(platform, cwd);

    info(`Detected platform: ${chalk.bold(platform)}`);

    if (fs.existsSync(MANIFEST)) {
      warn(`${MANIFEST} already exists — skipping manifest creation.`);
    } else {
      const platformIgnore = PLATFORM_IGNORE[platform] || [];
      const ignore = [...new Set([...DEFAULT_IGNORE, ...platformIgnore])];
      const manifest = {
        name,
        version: '1.0.0',
        platform,
        brainPath,
        ignore,
        created: new Date().toISOString(),
      };
      writeManifest(manifest);
      ok(`Created ${MANIFEST}`);
    }

    // .gitignore
    const manifest = readManifest();
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', buildGitignore(manifest.ignore));
      ok('Created .gitignore');
    } else {
      info('.gitignore already exists — skipping.');
    }

    // git init
    if (!gitOk()) {
      git(['init'], { check: true, stdio: 'pipe' });
      ok('Initialized git repository');
    } else {
      info('Git already initialized.');
    }

    log('');
    log(chalk.bold(`🧠 Brainpack "${name}" initialized!`));
    log(`   Platform : ${chalk.cyan(platform)}`);
    log(`   Brain    : ${chalk.cyan(brainPath)}`);
    log('');
    log(`Next: add a remote and run ${chalk.bold('brainpack push')}`);
  });

// brainpack push
program
  .command('push')
  .description('Stage all, commit, and push brain to remote')
  .option('-m, --message <msg>', 'Custom commit message')
  .action((opts) => {
    readManifest(); // ensure initialized
    if (!gitOk()) die('Not a git repository. Run brainpack init first.');

    const message = opts.message || `🧠 brain sync ${nowStamp()}`;

    git(['add', '-A'], { check: true });
    ok('Staged all files');

    // Check if there's anything to commit
    const status = git(['status', '--porcelain'], { check: false });
    if (!status.stdout.trim()) {
      info('Nothing to commit — brain is up to date.');
    } else {
      git(['commit', '-m', message], { check: true });
      ok(`Committed: ${chalk.dim(message)}`);
    }

    if (!hasRemote()) {
      warn('No remote configured. Skipping push.');
      info(`Add one: ${chalk.dim('git remote add origin <url>')}`);
      return;
    }

    // Get current branch
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { check: false }).stdout.trim() || 'main';
    git(['push', '-u', 'origin', branch], { check: true, stdio: 'inherit' });
    ok(`Pushed to origin/${branch}`);
  });

// brainpack pull
program
  .command('pull')
  .description('Pull latest brain from remote')
  .action(() => {
    readManifest();
    if (!gitOk()) die('Not a git repository.');
    if (!hasRemote()) die('No remote configured.');

    git(['pull', '--rebase'], { check: true, stdio: 'inherit' });
    ok('Brain pulled from remote.');
  });

// brainpack snapshot
program
  .command('snapshot [name]')
  .description('Create a named snapshot (git tag brain/<name>)')
  .option('--list', 'List all snapshots')
  .option('--restore <name>', 'Restore a snapshot')
  .action((name, opts) => {
    readManifest();
    if (!gitOk()) die('Not a git repository.');

    if (opts.list) {
      const r = git(['tag', '--list', 'brain/*', '--sort=-creatordate'], { check: false });
      const tags = r.stdout.trim();
      if (!tags) { info('No snapshots found.'); return; }
      log(chalk.bold('Snapshots:'));
      tags.split('\n').forEach((t) => log(`  ${chalk.cyan(t.replace('brain/', ''))}`));
      return;
    }

    if (opts.restore) {
      const tag = `brain/${opts.restore}`;
      const r = git(['tag', '--list', tag], { check: false });
      if (!r.stdout.trim()) die(`Snapshot "${opts.restore}" not found.`);
      git(['checkout', tag], { check: true, stdio: 'inherit' });
      ok(`Restored snapshot: ${chalk.bold(opts.restore)}`);
      return;
    }

    if (!name) die('Provide a snapshot name or use --list / --restore <name>');

    const tag = `brain/${name}`;
    const exists = git(['tag', '--list', tag], { check: false }).stdout.trim();
    if (exists) die(`Snapshot "${name}" already exists. Choose another name.`);

    git(['tag', tag], { check: true });
    ok(`Snapshot created: ${chalk.bold(name)} (tag: ${chalk.dim(tag)})`);

    if (hasRemote()) {
      git(['push', 'origin', tag], { check: false });
      ok(`Pushed tag to remote.`);
    }
  });

// brainpack export
program
  .command('export [file]')
  .description('Export brain as .tar.gz')
  .action(async (file) => {
    const manifest = readManifest();
    const cwd = process.cwd();
    const outFile = file || `brainpack-export-${dateStamp()}.tar.gz`;
    const files = collectBrainFiles(manifest.brainPath, manifest.ignore);

    // Always include the manifest
    const toInclude = [MANIFEST, ...files.filter((f) => f !== MANIFEST)];

    if (toInclude.length === 0) die('No files to export.');

    info(`Exporting ${toInclude.length} file(s) → ${chalk.bold(outFile)}`);

    await tar.create(
      { gzip: true, file: path.resolve(outFile), cwd },
      toInclude.filter((f) => fs.existsSync(path.join(cwd, f)))
    );

    const size = (fs.statSync(outFile).size / 1024).toFixed(1);
    ok(`Exported: ${chalk.bold(outFile)} (${size} KB)`);
  });

// brainpack import
program
  .command('import <file>')
  .description('Import a brain archive into current directory')
  .option('--force', 'Overwrite existing files without prompt')
  .action(async (file, opts) => {
    const absFile = path.resolve(file);
    if (!fs.existsSync(absFile)) die(`File not found: ${file}`);

    info(`Importing from ${chalk.bold(file)}...`);

    await tar.extract({ file: absFile, cwd: process.cwd() });

    ok(`Brain imported from ${chalk.bold(file)}`);
    if (fs.existsSync(MANIFEST)) {
      const m = readManifest();
      info(`Brain: ${chalk.bold(m.name)} (${m.platform})`);
    }
  });

// brainpack diff
program
  .command('diff')
  .description('Show uncommitted changes and untracked files')
  .action(() => {
    readManifest();
    if (!gitOk()) die('Not a git repository.');

    log(chalk.bold('─── Staged & unstaged changes ──────────────────────'));
    const diff = git(['diff', 'HEAD'], { check: false });
    if (diff.stdout.trim()) {
      log(diff.stdout);
    } else {
      info('No staged/unstaged changes.');
    }

    log(chalk.bold('─── Untracked files ─────────────────────────────────'));
    const untracked = git(['ls-files', '--others', '--exclude-standard'], { check: false });
    const files = untracked.stdout.trim().split('\n').filter(Boolean);
    if (files.length === 0) {
      info('No untracked files.');
    } else {
      files.forEach((f) => log(`  ${chalk.yellow('?')} ${f}`));
      log('');
      log(`  ${chalk.dim(files.length + ' untracked file(s)')}`);
    }
  });

// brainpack status
program
  .command('status')
  .description('Show brain status')
  .action(() => {
    const manifest = readManifest();
    const isGit = gitOk();

    log('');
    log(chalk.bold('🧠 Brain Status'));
    log(chalk.dim('─'.repeat(40)));

    log(`  Name     : ${chalk.cyan(manifest.name)}`);
    log(`  Version  : ${manifest.version}`);
    log(`  Platform : ${chalk.cyan(manifest.platform)}`);
    log(`  Path     : ${manifest.brainPath}`);

    if (isGit) {
      // Remote
      const remoteR = git(['remote', 'get-url', 'origin'], { check: false });
      const remote = remoteR.status === 0 ? remoteR.stdout.trim() : chalk.dim('none');
      log(`  Remote   : ${remote}`);

      // Last commit / sync
      const logR = git(['log', '-1', '--format=%ci %s'], { check: false });
      if (logR.stdout.trim()) {
        log(`  Last sync: ${chalk.dim(logR.stdout.trim())}`);
      } else {
        log(`  Last sync: ${chalk.dim('no commits yet')}`);
      }

      // Uncommitted changes
      const statusR = git(['status', '--porcelain'], { check: false });
      const lines = statusR.stdout.trim().split('\n').filter(Boolean);
      log(`  Pending  : ${lines.length === 0 ? chalk.green('clean') : chalk.yellow(lines.length + ' change(s)')}`);
    } else {
      log(`  Git      : ${chalk.dim('not initialized')}`);
    }

    // File count
    const files = collectBrainFiles(manifest.brainPath, manifest.ignore);
    log(`  Files    : ${files.length}`);

    log(chalk.dim('─'.repeat(40)));
    log('');
  });

// ─── Main ────────────────────────────────────────────────────────────────────

program
  .name('brainpack')
  .description('Platform-agnostic CLI for managing portable AI agent brains')
  .version(pkg.version, '-v, --version');

if (!process.argv.slice(2).length) {
  log('');
  log(chalk.cyan('  ╔══════════════════════════════════════╗'));
  log(chalk.cyan('  ║') + '                                      ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '      ' + chalk.bold.white('🧠  b r a i n p a c k') + '           ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '                                      ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + chalk.dim('    Pack your agent\'s brain.') + '           ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + chalk.dim('    Ship it anywhere.') + '                 ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '                                      ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')('  ╭──────╮ ') + '                    ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')(' ╭┤ ') + chalk.hex('#ffa6c9')('░░░░░░') + chalk.hex('#ff6b6b')(' ├╮') + '                   ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')(' │╰──────╯│') + '                   ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')(' │ ') + chalk.hex('#ffd93d')('◉') + '    ' + chalk.hex('#ffd93d')('◉') + chalk.hex('#ff6b6b')(' │') + '  ' + chalk.dim('v' + pkg.version) + '             ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')(' │  ') + chalk.hex('#6bcb77')('╰──╯') + chalk.hex('#ff6b6b')('  │') + '                   ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#ff6b6b')(' ╰───┬┬───╯') + '                   ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#4ecdc4')('   ╭─╯╰─╮') + '                     ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '    ' + chalk.hex('#4ecdc4')('   ╰─────╯') + '                     ' + chalk.cyan('║'));
  log(chalk.cyan('  ║') + '                                      ' + chalk.cyan('║'));
  log(chalk.cyan('  ╚══════════════════════════════════════╝'));
  log('');
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
