import { expect, jest, test } from "@jest/globals";
import sqlite3 from "sqlite3";
import {
  allAsync,
  getAsync,
  execAsync,
} from "../../src/server/sqlite3-async.mjs";

const db = new sqlite3.Database(":memory:");

test("allAsync throws an error on invalid SQL", async () => {
  await expect(() =>
    allAsync(db, "SELECT * FROM nonexistent_table"),
  ).rejects.toThrow("SQLITE_ERROR: no such table: nonexistent_table");
});

test("getAsync throws an error on invalid SQL", async () => {
  await expect(() =>
    allAsync(db, "SELECT * FROM nonexistent_table"),
  ).rejects.toThrow("SQLITE_ERROR: no such table: nonexistent_table");
});

test("execAsync throws an error on invalid SQL", async () => {
  await expect(() =>
    execAsync(db, "DROP TABLE nonexistent_table"),
  ).rejects.toThrow("SQLITE_ERROR: no such table: nonexistent_table");
});
