import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { readManifest } from '../manifest.js';
import { log } from '../utils.js';

const GUIDES = {
  openclaw: [
    { file: 'TOOLS.md', desc: 'API keys, tokens, device-specific notes', action: 'Recreate manually or copy securely (AirDrop, scp)' },
    { file: '~/.openclaw/openclaw.json', desc: 'Anthropic API key, model config, channels', action: 'Run `openclaw onboard` or copy from old machine' },
    { file: '~/.openclaw/credentials/', desc: 'Channel auth tokens (Telegram, Discord, etc)', action: 'Re-authenticate each channel on new machine' },
  ],
  cursor: [
    { file: '.cursor/settings.json', desc: 'API keys, editor preferences', action: 'Cursor re-creates on launch, re-enter API keys' },
  ],
  'claude-code': [
    { file: '~/.claude/credentials', desc: 'Auth tokens', action: 'Run `claude login`' },
  ],
  codex: [
    { file: '~/.codex/config.toml', desc: 'API keys, model settings', action: 'Recreate or copy securely' },
  ],
  generic: [],
};

export function cmdSecrets() {
  const manifest = readManifest();
  const cwd = process.cwd();

  log('');
  log(chalk.bold('🔐 Secrets Report'));
  log(chalk.dim('─'.repeat(50)));
  log('');

  log(chalk.bold('Excluded from brain (never shipped):'));
  const ignored = manifest.ignore || [];
  ignored.forEach((pattern) => {
    const absPath = path.join(cwd, pattern.replace(/\/$/, ''));
    const exists = fs.existsSync(absPath);
    const status = exists ? chalk.green('● present') : chalk.yellow('○ missing');
    log(`  ${status}  ${pattern}`);
  });

  log('');

  const platformGuide = GUIDES[manifest.platform] || GUIDES.generic;
  if (platformGuide.length > 0) {
    log(chalk.bold(`Setup guide for ${chalk.cyan(manifest.platform)}:`));
    log('');
    platformGuide.forEach((item) => {
      const absPath = item.file.startsWith('~')
        ? item.file.replace('~', process.env.HOME || '~')
        : path.join(cwd, item.file);
      const exists = fs.existsSync(absPath);
      const marker = exists ? chalk.green('✓') : chalk.red('✗');

      log(`  ${marker} ${chalk.bold(item.file)}`);
      log(`    ${chalk.dim(item.desc)}`);
      log(`    → ${item.action}`);
      log('');
    });
  }

  log(chalk.dim('─'.repeat(50)));
  log('');
  log(chalk.bold('On a new machine:'));
  log(`  1. ${chalk.cyan('brainpack pull')} or ${chalk.cyan('brainpack import')} — get your brain`);
  log(`  2. ${chalk.cyan('brainpack secrets')} — see what's missing`);
  log('  3. Manually set up the missing files listed above');
  log('');
  log(chalk.dim('Tip: Store secrets in a password manager (1Password, Bitwarden)'));
  log(chalk.dim('     and pull them down on the new machine.'));
  log('');
}
