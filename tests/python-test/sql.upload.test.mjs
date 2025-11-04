/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
jest.setTimeout(30000);

test('[core] upload_data creates DB and inserts all rows', async () => {
  const { dir } = workspace();
  const root = join(dir, 't');
  const csvs = join(root, 'Menu_CSVs');
  mkdirSync(csvs, { recursive: true });
  writeFileSync(join(csvs, 'R1.txt'), 'Item1,$9,Desc1\nItem2,$11,Desc2\n', 'utf-8');
  writeFileSync(join(csvs, 'R2.txt'), 'ItemA,$5,DescA\n', 'utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel = "t\\\\"
sqlite_connection.upload_data(rel)
db = sqlite3.connect(os.path.join(rel, "restaurants_raleigh.db"))
c = db.cursor()
c.execute("select count(*) from local_menu")
print(c.fetchone()[0])
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(Number(out)).toBe(3);
});

test('[edge] process_all_files skips malformed lines', async () => {
  const { dir } = workspace();
  const root = join(dir, 't2');
  const csvs = join(root, 'Menu_CSVs');
  mkdirSync(csvs, { recursive: true });
  writeFileSync(join(csvs, 'Rbad.txt'), 'Item1,$9,Desc1\nMALFORMED_LINE\nItem2,$7,Desc2\n', 'utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel = "t2\\\\"
sqlite_connection.upload_data(rel)
db = sqlite3.connect(os.path.join(rel, "restaurants_raleigh.db"))
c = db.cursor()
c.execute("select count(*) from local_menu")
print(c.fetchone()[0])
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(Number(out)).toBe(2);
});

test('[trivial] create_table can be called twice', async () => {
  const { dir } = workspace();
  const code = `
import sqlite3, sqlite_connection
db = sqlite3.connect(":memory:")
sqlite_connection.create_table(db)
sqlite_connection.create_table(db)
print("OK")
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out).toBe('OK');
});