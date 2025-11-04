/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
jest.setTimeout(30000);

function stubClientCSV(csv) {
  const b64 = Buffer.from(csv, 'utf-8').toString('base64');
  return `
import base64, menu_recreator
class _Msg: 
  def __init__(self, content): self.content = content
class _Choice:
  def __init__(self, content): self.message = _Msg(content)
class _Resp:
  def __init__(self, content): self.choices = [_Choice(content)]
class _Completions:
  def __init__(self, content): self._content=content
  def create(self, **kw): return _Resp(self._content)
class _Chat:
  def __init__(self, content): self.completions=_Completions(content)
class _Client:
  def __init__(self, content): self.chat=_Chat(content)
menu_recreator.client = _Client(base64.b64decode("${b64}").decode("utf-8"))
`;
}

const csvLinesOnly = (out) =>
  out.replace(/\r/g, '').split('\n').filter(l => l.includes(',') && !/successfully saved/i.test(l));

test('[core] recreate_menu writes simple CSV', async () => {
  const { dir } = workspace();
  const code = `
${stubClientCSV('Burger,$10,Juicy patty\nFries,$4,Crispy')}
import menu_recreator
out="menu.csv"
menu_recreator.recreate_menu("RAW", out)
print(open(out,"r",encoding="utf-8").read())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(csvLinesOnly(out)).toEqual(['Burger,$10,Juicy patty','Fries,$4,Crispy']);
});

test('[edge] recreate_menu skips blank lines in model output', async () => {
  const { dir } = workspace();
  const code = `
${stubClientCSV('Burger,$10,Good\n\nFries,$4,Ok\n')}
import menu_recreator, json
out="m.csv"
menu_recreator.recreate_menu("RAW", out)
print(open(out,"r",encoding="utf-8").read().splitlines())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const last = out.trim().split('\n').pop();
  const arr = JSON.parse(last.replace(/'/g,'"'));
  expect(arr).toEqual(['Burger,$10,Good','Fries,$4,Ok']);
});

test('[assumption] recreate_menu uses QUOTE_MINIMAL for commas', async () => {
  const { dir } = workspace();
  const code = `
${stubClientCSV('"Fish, and Chips","$12","Crispy, flaky"')}
import menu_recreator
out="q.csv"
menu_recreator.recreate_menu("RAW", out)
print(open(out,"r",encoding="utf-8").read().strip())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out.trim().split('\n').pop()).toBe('"Fish, and Chips",$12,"Crispy, flaky"');
});

test('[csv] description with quotes is escaped correctly', async () => {
  const { dir } = workspace();
  const code = `
${stubClientCSV('Sauce,$5,Delicious "house" sauce')}
import menu_recreator
out="menu.csv"
menu_recreator.recreate_menu("RAW", out)
print(open(out,"r",encoding="utf-8").read().strip())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out.trim().split('\n').pop()).toBe('Sauce,$5,"Delicious ""house"" sauce"');
});