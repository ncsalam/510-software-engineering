/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
jest.setTimeout(30000);

const lastLine = (out) => out.replace(/\r/g, '').trim().split('\n').pop();

test('[core] Main.open_restaurant_list reads an existing file', async () => {
  const { dir } = workspace();
  const code = `
import Main
Main.relative_path = ""
with open("Restaurant_List.txt","w",encoding="utf-8") as f: f.write("A,B,C")
lst = Main.open_restaurant_list()
print(",".join(lst))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastLine(out)).toBe('A,B,C');
});

test('[assumption] Main.make_website_content_folder creates folder', async () => {
  const { dir } = workspace();
  const code = `
import os, Main
Main.content_folder_path = "Raw_Website_Content"
if os.path.exists(Main.content_folder_path): raise SystemExit(2)
Main.make_website_content_folder()
print(os.path.isdir("Raw_Website_Content"))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastLine(out)).toBe('True');
});

test('[idempotent] make_website_content_folder does not crash if folder exists', async () => {
  const { dir } = workspace();
  const code = `
import os, Main
Main.content_folder_path = "Raw_Website_Content"
os.makedirs("Raw_Website_Content", exist_ok=True)
Main.make_website_content_folder()
print(os.path.isdir("Raw_Website_Content"))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastLine(out)).toBe('True');
});

test('[core] Main.extract_website_content iterates url_list → files', async () => {
  const { dir } = workspace();
  const code = `
import os, Main, types
Main.restaurant_list = ["R1","R2"]
Main.url_list = ["http://u1","http://u2"]
Main.content_folder_path = "Raw_Website_Content"; os.makedirs("Raw_Website_Content", exist_ok=True)
calls=[]
def fake_extract(url, out): calls.append(f"{url}->{out}")
Main.html_tools = types.SimpleNamespace(extract_content=fake_extract)
Main.extract_website_content()
print("\\n".join(calls))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const lines = out.replace(/\r/g, '').split('\n').filter(l => l.includes('->'));
  expect(lines).toEqual([
    'http://u1->Raw_Website_Content\\R1.txt',
    'http://u2->Raw_Website_Content\\R2.txt',
  ]);
});

test('[fallback] open_restaurant_list triggers create_restaurant_list without input()', async () => {
  const { dir } = workspace();
  const code = `
import Main
Main.relative_path = ""
def fake_create():
    open("Restaurant_List.txt","w",encoding="utf-8").write("X,Y")
Main.create_restaurant_list = fake_create   # avoid input()
lst = Main.open_restaurant_list()
print(",".join(lst))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lastLine(out)).toBe('X,Y');
});