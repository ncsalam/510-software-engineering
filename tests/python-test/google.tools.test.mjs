/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
jest.setTimeout(30000);

test('[core] build_payload uses env keys and default num', async () => {
  const { dir } = workspace();
  const code = `
import os, json, google_tools
os.environ['SEARCH_API_KEY']='k'
os.environ['CX_ID']='cx'
p = google_tools.build_payload("tacos")
print(json.dumps(p, sort_keys=True))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(JSON.parse(out)).toEqual({ cx: 'cx', key: 'k', num: 1, q: 'tacos' });
});

test('[core] build_payload merges extra params', async () => {
  const { dir } = workspace();
  const code = `
import os, json, google_tools
os.environ['SEARCH_API_KEY']='k'
os.environ['CX_ID']='cx'
p = google_tools.build_payload("pizza", start=1, num=3, gl='us', safe='active')
print(json.dumps(p, sort_keys=True))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const obj = JSON.parse(out);
  expect(obj).toMatchObject({ cx: 'cx', key: 'k', q: 'pizza', num: 3, gl: 'us', safe: 'active' });
});

test('[core] send_payload returns first link on 200', async () => {
  const { dir } = workspace();
  const code = `
import google_tools, types
class R:
  def __init__(self, code, data): self.status_code=code; self._data=data
  def json(self): return self._data
google_tools.requests = types.SimpleNamespace(get=lambda url, params: R(200, {"items":[{"link":"https://x"}]}))
print(google_tools.send_payload({"q":"x"}))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out).toBe('https://x');
});

test('[fault] send_payload raises on non-200', async () => {
  const { dir } = workspace();
  const code = `
import google_tools, types
class R:
  def __init__(self, code): self.status_code=code
  def json(self): return {}
google_tools.requests = types.SimpleNamespace(get=lambda url, params: R(500))
try:
  google_tools.send_payload({"q":"x"})
  print("NO")
except Exception:
  print("YES")
`;
  const out = await runPy(['-c', code], { cwd: dir });
// code prints status code first; assert suffix
  expect(out.trim().endsWith('YES')).toBe(true);
});

test('[core] restaurant_search dedup + writes Restaurant_List.txt', async () => {
  const { dir } = workspace();
  const code = `
import os, google_tools, types
os.environ['PLACES_API_KEY']='abc'
os.makedirs("src\\\\database", exist_ok=True)
def post(url, headers=None, data=None):
  return types.SimpleNamespace(json=lambda: {"places":[
    {"displayName":{"text":"A"}},{"displayName":{"text":"B"}},{"displayName":{"text":"A"}}
  ]})
google_tools.requests = types.SimpleNamespace(post=post)
google_tools.restaurant_search(["Thai","Indian"], "Raleigh")
print(open("src\\\\database\\\\Restaurant_List.txt","r",encoding="utf-8").read())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(out).toBe('A,B');
});

test('[assumption] restaurant_search formats textQuery', async () => {
  const { dir } = workspace();
  const code = `
import os, json, google_tools, types
os.environ['PLACES_API_KEY']='abc'
os.makedirs("src\\\\database", exist_ok=True)
seen=[]
def post(url, headers=None, data=None):
  seen.append(json.loads(data)["textQuery"])
  return types.SimpleNamespace(json=lambda: {"places":[]})
google_tools.requests = types.SimpleNamespace(post=post)
google_tools.restaurant_search(["Sushi","BBQ"], "Raleigh")
print("\\n".join(seen))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const lines = out.replace(/\\r/g, '').split('\n').filter(Boolean);
  expect(lines).toEqual(['Sushi Restaurants in Raleigh', 'BBQ Restaurants in Raleigh']);
});