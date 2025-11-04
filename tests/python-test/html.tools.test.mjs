/** @jest-environment node */
import { jest } from '@jest/globals';
import { runPy, workspace } from '../helpers/python.js';
jest.setTimeout(30000);

function lines(out) {
  return out.replace(/\r/g, '').split('\n');
}

function contentOnly(out) {
  // drop friendly log lines like "✅ ... saved" or "⚠️ Skipped ..."
  return lines(out).filter(l => !/saved \(\d+ lines\)\.$/i.test(l) && !/^⚠️/u.test(l) && !/^✅/u.test(l));
}

test('[core] extract_content keeps visible text in order', async () => {
  const { dir } = workspace();
  const code = `
import html_tools, types
html = "<html><head><style>x</style><script>y()</script></head><body>a\\n b<noscript>hide</noscript>\\n c</body></html>"
def get(url): return types.SimpleNamespace(text=html, raise_for_status=lambda: None)
html_tools.requests = types.SimpleNamespace(get=get, exceptions=types.SimpleNamespace(RequestException=Exception))
out = "out.txt"
html_tools.extract_content("http://x", out, min_lines=1, max_lines=50)
print(open(out,"r",encoding="utf-8").read())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(contentOnly(out)).toEqual(['a','b','c']);
});

test('[edge] extract_content skips when under min_lines', async () => {
  const { dir } = workspace();
  const code = `
import html_tools, types, os
html = "<html><body>one</body></html>"
def get(url): return types.SimpleNamespace(text=html, raise_for_status=lambda: None)
html_tools.requests = types.SimpleNamespace(get=get, exceptions=types.SimpleNamespace(RequestException=Exception))
out = "small.txt"
html_tools.extract_content("http://x", out, min_lines=5, max_lines=100)
print("exists= ", os.path.exists(out))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const last = lines(out).pop();
  expect(last).toBe('exists= False');
});

test('[edge] extract_content skips when over max_lines', async () => {
  const { dir } = workspace();
  const code = `
import html_tools, types, os
big = "\\n".join("x" for _ in range(100))
html = "<html><body>"+big+"</body></html>"
def get(url): return types.SimpleNamespace(text=html, raise_for_status=lambda: None)
html_tools.requests = types.SimpleNamespace(get=get, exceptions=types.SimpleNamespace(RequestException=Exception))
out = "big.txt"
html_tools.extract_content("http://x", out, min_lines=1, max_lines=10)
print("exists= ", os.path.exists(out))
`;
  const out = await runPy(['-c', code], { cwd: dir });
  const last = lines(out).pop();
  expect(last).toBe('exists= False');
});

test('[fault] extract_content handles RequestException', async () => {
  const { dir } = workspace();
  const code = `
import html_tools, types
def bad(url): raise html_tools.requests.exceptions.RequestException("boom")
html_tools.requests = types.SimpleNamespace(get=bad, exceptions=types.SimpleNamespace(RequestException=Exception))
html_tools.extract_content("http://x", "out.txt", min_lines=1)
print("OK")
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(lines(out).pop()).toBe('OK');
});

test('[trivial] extract_content preserves line order', async () => {
  const { dir } = workspace();
  const code = `
import html_tools, types
html = "<html><body>a\\nb\\nc</body></html>"
def get(url): return types.SimpleNamespace(text=html, raise_for_status=lambda: None)
html_tools.requests = types.SimpleNamespace(get=get, exceptions=types.SimpleNamespace(RequestException=Exception))
out = "o.txt"
html_tools.extract_content("http://x", out, min_lines=1, max_lines=10)
print(open(out,"r",encoding="utf-8").read())
`;
  const out = await runPy(['-c', code], { cwd: dir });
  expect(contentOnly(out).join('\n')).toBe('a\nb\nc');
});