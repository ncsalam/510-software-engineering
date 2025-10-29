import sqlite3 from "sqlite3";
import { allAsync, getAsync, execAsync } from "./sqlite3-async.mjs";

export const db = new sqlite3.Database(":memory:");

// we have to synchronously track chat ID creation
// to enable concurrent chat creation requests
var idCounter = 1;

// unfortunately, foreign key constraints don't seem to be
// working correctly, so we have to enforce them manually.
const INIT_SQL_SCRIPT = `
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS messages;

CREATE TABLE chats (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  chat_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  content STRING NOT NULL,
  FOREIGN KEY (chat_id)
   REFERENCES chats (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (role_id)
    REFERENCES roles (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

INSERT INTO roles (id, name)
VALUES
(1, "user"),
(2, "assistant"),
(3, "system");
`;

/**
 * initializes (or resets) the chat database.
 */
export async function init() {
  idCounter = 1;
  await execAsync(db, INIT_SQL_SCRIPT);
}

/**
 * creates a new chat.
 *
 * @returns {Promise<Number>} the id of the new chat.
 */
export async function newChat() {
  const id = idCounter;
  idCounter++;
  await execAsync(
    db,
    `INSERT INTO chats (id, created_at) VALUES (${id}, datetime("now"));`,
  );
  return id;
}

/**
 * delete a chat by id number (if it exists).
 *
 * @param {Number} id - chat id number
 */
export async function deleteChat(id) {
  await validateId(id);
  await execAsync(db, `DELETE FROM chats WHERE id=${id}`);
  await execAsync(db, `DELETE FROM messages WHERE chat_id=${id}`);
}

/**
 * get the complete message history for chat {id}.
 *
 * @param {Number} id - chat id number
 */
export async function getHistory(id) {
  await validateId(id);
  return await allAsync(
    db,
    `SELECT roles.name AS role, content FROM messages INNER JOIN roles on roles.id = messages.role_id WHERE chat_id=${id}`,
  );
}

/**
 * logs a message to the chat history database.
 *
 * @param {Number} id - chat id number
 * @param {string} role - role of the message (system, user, or assistant)
 * @param {string} content - text contents of the message.
 */
export async function logMessage(id, role, content) {
  const role_info = await getAsync(
    db,
    `SELECT id from roles WHERE name="${role}"`,
  );
  if (role_info === undefined)
    throw new RangeError(
      `"${role}" is not a valid role (must be one of "system", "user", or "assistant")`,
    );
  await validateId(id);

  await execAsync(
    db,
    `INSERT INTO messages (chat_id, role_id, content) VALUES (${id}, ${role_info.id}, "${content}")`,
  );
}

/**
 * determines whether or not a chat with the given id exists.
 *
 * @param {Number} id- chat id number
 * @returns {Promise<bool>} whether or not the chat exists
 */
export async function chatExists(id) {
  return (
    (await getAsync(db, `SELECT * from chats WHERE id="${id}"`)) !== undefined
  );
}

async function validateId(id) {
  if (!(await chatExists(id))) {
    throw new RangeError(`no chat with id "${id}" exists.`);
  }
}
