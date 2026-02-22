import chalk from 'chalk';

export function log(msg) { console.log(msg); }
export function ok(msg) { console.log(chalk.green('✓') + ' ' + msg); }
export function info(msg) { console.log(chalk.cyan('ℹ') + ' ' + msg); }
export function warn(msg) { console.log(chalk.yellow('⚠') + ' ' + msg); }
export function err(msg) { console.error(chalk.red('✗') + ' ' + msg); }
export function die(msg) { err(msg); process.exit(1); }

export function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
