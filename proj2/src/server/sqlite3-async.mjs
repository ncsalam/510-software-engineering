// wrapper functions to convert sqlite3 callback-style functions
// into modern promise/async functions.

import sqlite3 from "sqlite3";

/**
 * execute an SQL script. does not return anything.
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
 * execute an SQL query and get a single result.
 *
 * @param {sqlite3.Database} db - database connection to use.
 * @param {string} sql - SQL code to execute.
 * @returns {Promise<Object>}
 */
export async function getAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
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
