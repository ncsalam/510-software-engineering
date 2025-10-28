import sqlite3 from "sqlite3";

const db = new sqlite3.Database(":memory:");

const INIT_SQL_SCRIPT = `
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
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

async function execAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function getAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

async function allAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
}

await execAsync(db, INIT_SQL_SCRIPT);

/**
 * creates a new chat.
 *
 * @returns {Number} the id of the new chat.
 */
export async function newChat() {
  await execAsync(
    db,
    `INSERT INTO chats (created_at) VALUES (datetime("now"));`,
  );
  return (await getAsync(db, `SELECT id FROM chats ORDER BY id DESC;`)).id;
}

/**
 * delete a chat by id number.
 * @param {Number} id - chat id number
 */
export async function deleteChat(id) {
  await execAsync(db, `DELETE FROM chats WHERE id=${id}`);
}

/**
 * get the complete message history for chat {id}.
 *
 * @param {Number} id - chat id number
 */
export async function getHistory(id) {
  return await allAsync(
    db,
    `SELECT roles.name AS role, content FROM messages INNER JOIN roles on roles.id = messages.role_id WHERE chat_id=${id}`,
  );
}

/**
 * logs a message to the chat history database
 * @param {Number} id - chat id number
 * @param {string} role - role of the message (system, user, or assistant)
 * @param {string} content - text contents of the message.
 */
export async function logMessage(id, role, content) {
  const role_id = (
    await getAsync(db, `SELECT id from roles WHERE name="${role}"`)
  ).id;
  await execAsync(
    db,
    `INSERT INTO messages (chat_id, role_id, content) VALUES (${id}, ${role_id}, "${content}")`,
  );
}
