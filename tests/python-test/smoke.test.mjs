/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';

jest.setTimeout(20000);

test('[smoke] jest can spawn python and write to tests/database-test', async () => {
  const { dir } = workspace();
  const out = await runPy(['-c', 'print("ok")'], { cwd: dir });
  expect(out).toBe('ok');
});