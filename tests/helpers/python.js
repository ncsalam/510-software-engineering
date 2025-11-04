import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';

export function pythonCmd() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

export function workspace(prefix = 'run-') {
  const base = join(process.cwd(), 'tests', 'database-test');
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, prefix));
  return { dir };
}

export function runPy(args, { cwd, env } = {}) {
  const runCwd = cwd ?? process.cwd();
  const root = process.cwd();

  const pathParts = [
    root,
    join(root, 'src'),
    join(root, 'src', 'database'),
    join(root, 'proj2', 'src', 'database'),
    process.env.PYTHONPATH || ''
  ].filter(Boolean);

  const mergedEnv = {
    ...process.env,
    ...env,
    PYTHONPATH: pathParts.join(delimiter),
    PYTHONIOENCODING: 'utf-8', // <- stops UnicodeEncodeError for emojis/log symbols on Windows
  };

  return new Promise((resolve, reject) => {
    const child = spawn(pythonCmd(), args, {
      cwd: runCwd,
      env: mergedEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => {
      if (code !== 0) return reject(new Error(err || `exit ${code}`));
      resolve(out.trim());
    });
  });
}