/**
 * pulls relevant restaurant data from the database and prepares it as an ollama system prompt
 *
 * @module server/restaurant-data
 */

import sqlite3 from "sqlite3";
import { allAsync } from "./sqlite3-async.mjs";
import path from "node:path";

const db = new sqlite3.Database(new URL("../database/restaurants_raleigh.db", import.meta.url).pathname);
const N_ITEMS = 1000;

/**
 * pick n random items from list l.
 *
 * @param {array} l
 * @param {number} n
 */
function randomSublist(l, n) {
  if (n > l.length) return l;
  const src = [...l];
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * src.length);
    out.push(src.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * get relevant menu items from the database as stringified JSON.
 *
 * @param {string} [userMessage] - the user message to use when filtering for relevance (not implemented)
 * @returns {Promise<string>}
 */
export async function getRestaurantData(userMessage) {
  // the most basic implementation: gets the entire database.
  const res = await allAsync(db, `SELECT name, price, description, restaurant FROM local_menu`);
  // todo: filter by relevance, somehow?
  return JSON.stringify(randomSublist(res, N_ITEMS), null, 2);
}
