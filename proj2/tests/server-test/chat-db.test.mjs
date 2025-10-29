import { beforeEach, expect, jest, test } from "@jest/globals";
import * as db from "../../src/server/chat-db.mjs";

beforeEach(db.init);

test("init resets the database", async () => {
  const id = await db.newChat();
  expect(await db.chatExists(id)).toBe(true);
  await db.init();
  expect(await db.chatExists(id)).toBe(false);
});

test("newChat creates sequential chats correctly", async () => {
  expect(await db.newChat()).toBe(1);
  expect(await db.newChat()).toBe(2);
});

test("newChat creates concurrent chat requests correctly", async () => {
  const p1 = db.newChat();
  const p2 = db.newChat();

  const id1 = await p1;
  const id2 = await p2;
  expect(id1).toBe(1);
  expect(id2).toBe(2);
});

test("deleteChat deletes existing chats", async () => {
  const id = await db.newChat();
  expect(await db.chatExists(id)).toBe(true);
  await db.deleteChat(id);
  expect(await db.chatExists(id)).toBe(false);
});

test("deleteChat throws an error when deleting nonexistent chats", async () => {
  await expect(() => db.deleteChat(9999)).rejects.toThrow(
    'no chat with id "9999" exists.',
  );
});

test("chatExists works correctly", async () => {
  expect(await db.chatExists(9999)).toBe(false);
  expect(await db.chatExists(await db.newChat())).toBe(true);
});

test("getHistory throws an error for nonexistent chats", async () => {
  await expect(() => db.getHistory(9999)).rejects.toThrow(
    'no chat with id "9999" exists.',
  );
});

test("logMessage fails with an invalid role string", async () => {
  const id = await db.newChat();
  await expect(() =>
    db.logMessage(id, "invalidRole", "message"),
  ).rejects.toThrow(`"invalidRole" is not a valid role`);
});

test("logMessage fails with an invalid id", async () => {
  await expect(() => db.logMessage(9999, "user", "message")).rejects.toThrow(
    'no chat with id "9999" exists.',
  );
});

test("logMessage and getHistory work correctly", async () => {
  const id = await db.newChat();
  const messages = [
    { role: "system", content: "this is a system prompt" },
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ];
  for (const m of messages) {
    await db.logMessage(id, ...Object.values(m));
  }
  expect(await db.getHistory(id)).toEqual(messages);
});
