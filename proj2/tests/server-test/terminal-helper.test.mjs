import { jest } from "@jest/globals";
import * as t from "../../src/server/terminal-helper.mjs";

test("hideCursor prints the correct ANSI code", () => {
  const mockConsole = jest.fn();
  process.stdout.write = mockConsole;
  t.hideCursor();
  expect(mockConsole.mock.calls[0][0]).toBe("\x1b[?25l");
});

test("showCursor prints the correct ANSI code", () => {
  const mockConsole = jest.fn();
  process.stdout.write = mockConsole;
  t.showCursor();
  expect(mockConsole.mock.calls[0][0]).toBe("\x1b[?25h");
});

test("moveUp prints the correct ANSI code", () => {
  const mockConsole = jest.fn();
  process.stdout.write = mockConsole;
  t.moveUp(2);
  t.moveUp(0);
  expect(mockConsole.mock.calls[0][0]).toBe("\x1b[2F");
  expect(mockConsole.mock.calls[1][0]).toBe("\x1b[0F");
});

test("color prints the correct ANSI code", () => {
  expect(t.color("hello")).toBe("\x1b[1;39;49mhello\x1b[0m");
  expect(t.color("hello", { bold: false })).toBe("\x1b[2;39;49mhello\x1b[0m");
  expect(t.color("hello", { bold: false, fg: t.COLORS.BLUE })).toBe("\x1b[2;34;49mhello\x1b[0m");
  expect(t.color("hello", { bg: t.COLORS.MAGENTA })).toBe("\x1b[1;39;45mhello\x1b[0m");
});
