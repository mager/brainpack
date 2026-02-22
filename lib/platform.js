import fs from 'fs';
import path from 'path';
import { MANIFEST } from './manifest.js';

export const PLATFORM_IGNORE = {
  openclaw:     ['TOOLS.md', '.openclaw/', '.pi/', '.agents/'],
  cursor:       ['.cursor/settings.json'],
  'claude-code': [],
  windsurf:     [],
  cline:        [],
  'roo-code':   [],
  codex:        [],
  aider:        [],
  continue:     [],
  goose:        [],
  devin:        [],
  bolt:         [],
  replit:       ['.cache/', '.upm/'],
  copilot:      [],
  amp:          [],
  generic:      [],
};

/**
 * Detect the agent platform used in `dir`.
 * Skips detection if `brainpack.json` already exists (prevents false positives
 * when running brainpack inside its own repo).
 */
export function detectPlatform(dir = process.cwd()) {
  const has = (f) => fs.existsSync(path.join(dir, f));

  // If brainpack is already initialized, trust the manifest
  if (has(MANIFEST)) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8'));
      if (m.platform) return m.platform;
    } catch { /* fall through */ }
  }

  // Ordered most-specific → least-specific
  if (has('.cursor') || has('.cursorrules'))              return 'cursor';
  if (has('.claude') || has('CLAUDE.md'))                 return 'claude-code';
  if (has('.windsurf') || has('.windsurfrules'))          return 'windsurf';
  if (has('.cline') || has('.clinerules'))                return 'cline';
  if (has('.roo') || has('.roorules'))                    return 'roo-code';
  if (has('.codex') || has('codex.md'))                   return 'codex';
  if (has('.aider.conf.yml') || has('.aiderignore'))      return 'aider';
  if (has('.continue'))                                   return 'continue';
  if (has('.goosehints'))                                 return 'goose';
  if (has('devin.md'))                                    return 'devin';
  if (has('.bolt'))                                       return 'bolt';
  if (has('.replit'))                                     return 'replit';
  if (has('.github/copilot-instructions.md'))             return 'copilot';
  if (has('.amp'))                                        return 'amp';
  // OpenClaw-specific files — checked last to avoid brainpack self-detection
  if (has('SOUL.md') || has('AGENTS.md'))                 return 'openclaw';

  return 'generic';
}

export function platformBrainPath(platform) {
  switch (platform) {
    case 'cursor': return '.cursor/rules';
    default:       return '.';
  }
}
