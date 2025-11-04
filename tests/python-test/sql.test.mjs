/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
jest.setTimeout(30000);

const lastNumber = (out) => {
  const last = out.trim().split('\n').pop();
  const n = Number(String(last).trim());
  return Number.isFinite(n) ? n : NaN;
};
const lines = (out) => out.replace(/\r/g,'').trim().split('\n');
const toSetLower = (arr) => new Set(arr.map(s=>s.toLowerCase()));

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
  expect(lastNumber(out)).toBe(3);
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
  expect(lastNumber(out)).toBe(2);
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
  expect(out.trim().split('\n').pop()).toBe('OK');
});

test('[schema] PRAGMA columns & types match expected set', async () => {
  const { dir } = workspace();
  const root = join(dir,'t3');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'R.txt'),'X,$1,Desc\n','utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel="t3\\\\"
sqlite_connection.upload_data(rel)
db=sqlite3.connect(os.path.join(rel,"restaurants_raleigh.db"))
c=db.cursor()
c.execute("PRAGMA table_info(local_menu)")
for cid,name,typ,_,_,_ in c.fetchall():
    print(f"{name}:{typ}")
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const got = toSetLower(lines(out));
  const expected = toSetLower(['id:INTEGER','name:TEXT','price:TEXT','description:TEXT','restaurant:TEXT']);
  expect([...expected].every(e => got.has(e))).toBe(true);
});

test('[schema] restaurant column reflects filename base', async () => {
  const { dir } = workspace();
  const root = join(dir,'t4');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'R1.txt'),'I1,$1,D1\n','utf-8');
  writeFileSync(join(csvs,'R2.txt'),'I2,$2,D2\n','utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel="t4\\\\"
sqlite_connection.upload_data(rel)
db=sqlite3.connect(os.path.join(rel,"restaurants_raleigh.db"))
c=db.cursor()
for r,n,p in c.execute("select restaurant,name,price from local_menu order by restaurant,name"):
    print(f"{r}|{n}|{p}")
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  // Filter out friendly logs like "✅ 1 rows inserted..." and "🎉 All files processed..."
  const rows = lines(out).filter(l => l.includes('|'));
  expect(rows).toEqual(['R1|I1|$1','R2|I2|$2']);
});

test('[schema] CSV parser preserves commas within quoted description', async () => {
  const { dir } = workspace();
  const root = join(dir,'t5');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'R.txt'),'ItemX,$1,"Yummy, tasty"\n','utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel="t5\\\\"
sqlite_connection.upload_data(rel)
db=sqlite3.connect(os.path.join(rel,"restaurants_raleigh.db"))
c=db.cursor()
c.execute("select description from local_menu where name='ItemX'")
print(c.fetchone()[0])
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out.trim().split('\n').pop()).toBe('Yummy, tasty');
});

test('[ingest] processes both .txt and .md files as plain rows', async () => {
  const { dir } = workspace();
  const root = join(dir,'t6');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'Keep.txt'),'A,$1,D\n','utf-8');
  writeFileSync(join(csvs,'Also.md'),'B,$2,D\n','utf-8');  // current code ingests any file in folder

  const code = `
import sqlite3, os, sqlite_connection
rel="t6\\\\"
sqlite_connection.upload_data(rel)
db=sqlite3.connect(os.path.join(rel,"restaurants_raleigh.db"))
c=db.cursor()
c.execute("select count(*) from local_menu")
print(c.fetchone()[0])
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastNumber(out)).toBe(2);
});

test('[ingest] empty .txt file does not insert rows', async () => {
  const { dir } = workspace();
  const root = join(dir,'t7');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'Empty.txt'),'','utf-8');
  writeFileSync(join(csvs,'Data.txt'),'X,$3,D\n','utf-8');

  const code = `
import sqlite3, os, sqlite_connection
rel="t7\\\\"
sqlite_connection.upload_data(rel)
db=sqlite3.connect(os.path.join(rel,"restaurants_raleigh.db"))
c=db.cursor()
c.execute("select count(*) from local_menu")
print(c.fetchone()[0])
db.close()
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastNumber(out)).toBe(1);
});

test('[persistence] upload_data creates restaurants_raleigh.db file', async () => {
  const { dir } = workspace();
  const root = join(dir,'t8');
  const csvs = join(root,'Menu_CSVs');
  mkdirSync(csvs, { recursive:true });
  writeFileSync(join(csvs,'R.txt'),'A,$1,D\n','utf-8');

  const code = `
import os, sqlite_connection
rel="t8\\\\"
sqlite_connection.upload_data(rel)
print(os.path.exists(os.path.join(rel,"restaurants_raleigh.db")))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out.trim().split('\n').pop()).toBe('True');
});