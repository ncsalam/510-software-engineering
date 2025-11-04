// wrapper functions to convert sqlite3 callback-style functions
// into modern promise/async functions.

import sqlite3 from "sqlite3";

/**
 * execute an SQL script. does not return anything. For database initialization.
 *
 * @param {sqlite3.Database} db - database connection to use.
 * @param {string} sql - SQL code to execute.
 * @returns {Promise}
 */
export async function execAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

/**
 * execute a single SQL statement (e.g., insert/update/delete) with optional `?` parameters.
 *
 * @param {sqlite3.Database} db - database connection to use.
 * @param {string} sql - SQL code to execute (may include `?` placeholders).
 * @param {Array} [params=[]] - values to bind to `?` placeholders in order.
 * @returns {Promise}
 */
export function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // has lastID, changes
    });
  });
}

/**
 * execute an SQL query and get a single result.
 *
 * @param {sqlite3.Database} db - database connection to use.
 * @param {string} sql - SQL code to execute.
 * @param {Array} [params] - optional values to bind to `?` placeholders.
 * @returns {Promise<Object>}
 */
export function getAsync(db, sql, params) {
  return new Promise((resolve, reject) => {
    const cb = (err, row) => (err ? reject(err) : resolve(row));
    if (params !== undefined) db.get(sql, params, cb);
    else db.get(sql, cb);
  });
}

/**
 * execute an SQL query and get all results.
 *
 * @param {sqlite3.Database} db - database connection to use.
 * @param {string} sql - SQL code to execute.
 * @returns {Promise<Object[]>}
 */
export async function allAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
}
