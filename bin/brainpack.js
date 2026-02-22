#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

import { cmdInit }     from '../lib/commands/init.js';
import { cmdPush }     from '../lib/commands/push.js';
import { cmdPull }     from '../lib/commands/pull.js';
import { cmdSnapshot } from '../lib/commands/snapshot.js';
import { cmdExport }   from '../lib/commands/export.js';
import { cmdImport }   from '../lib/commands/import.js';
import { cmdDiff }     from '../lib/commands/diff.js';
import { cmdStatus }   from '../lib/commands/status.js';
import { cmdSecrets }  from '../lib/commands/secrets.js';
import { log }         from '../lib/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// ─── Commands ────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize current directory as a brainpack')
  .option('--name <name>', 'Brain name (default: folder name)')
  .option('--platform <platform>', 'Platform override (openclaw/cursor/claude-code/generic)')
  .action((opts) => cmdInit(opts));

program
  .command('push')
  .description('Stage all, commit, and push brain to remote')
  .option('-m, --message <msg>', 'Custom commit message')
  .action((opts) => cmdPush(opts));

program
  .command('pull')
  .description('Pull latest brain from remote')
  .action(() => cmdPull());

program
  .command('snapshot [name]')
  .description('Create a named snapshot (git tag brain/<name>)')
  .option('--list', 'List all snapshots')
  .option('--restore <name>', 'Restore a snapshot')
  .action((name, opts) => cmdSnapshot(name, opts));

program
  .command('export [file]')
  .description('Export brain as .tar.gz')
  .action(async (file) => await cmdExport(file));

program
  .command('import <file>')
  .description('Import a brain archive into current directory')
  .option('--force', 'Overwrite existing files without prompt')
  .action(async (file, opts) => await cmdImport(file, opts));

program
  .command('diff')
  .description('Show uncommitted changes and untracked files')
  .action(() => cmdDiff());

program
  .command('status')
  .description('Show brain status')
  .action(() => cmdStatus());

program
  .command('secrets')
  .description('Show excluded sensitive files and setup guide for new machines')
  .action(() => cmdSecrets());

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
