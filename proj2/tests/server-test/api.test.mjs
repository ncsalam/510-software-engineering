/**
 * @jest-environment node
 */

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { factory } from "./mock-ollama.mjs";
import supertest from "supertest";
import * as db from "../../src/server/chat-db.mjs";

// mock ollama to avoid long API calls
jest.unstable_mockModule("ollama", factory);

const app = await import("../../src/app.mjs");
const request = supertest(app.app);

beforeEach(db.init);

test("static homepage content is served", async () => {
  const res = await request.get("/");
  expect(res.statusCode).toEqual(200);
  expect(res.text).toMatch(/^<!DOCTYPE html>/);
});

describe("POST /api/send ", () => {
  test("fails if message is missing", async () => {
    const res = await request.post("/api/send");
    expect(res.statusCode).toEqual(422);
    expect(res.body).toHaveProperty("errors");
    expect(res.body.errors[0].msg).toEqual("'message' field is missing.");
  });

  test("returns the LLM response", async () => {
    const res = await request
      .post("/api/send")
      .send({ message: "message" })
      .set("Content-Type", "application/json");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("response");
  });
});

describe("POST /api/chat", () => {
  test("returns a new chat resource", async () => {
    const res = await request.post("/api/chat");
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.id).toEqual(1);
  });
});

describe("POST /api/chat/:id", () => {
  test("returns code 404 for invalid ids", async () => {
    const res = await request.post("/api/chat/1");
    expect(res.statusCode).toEqual(404);
  });
  test("returns code 422 if the message field is missing", async () => {
    const id = (await request.post("/api/chat")).body.id;
    const res = await request.post(`/api/chat/${id}`);
    expect(res.statusCode).toEqual(422);
  });

  test("returns a LLM response", async () => {
    const id = (await request.post("/api/chat")).body.id;
    const res = await request
      .post(`/api/chat/${id}`)
      .send({ message: "message" })
      .set("Content-Type", "application/json");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("response");
  });

  test("stores the chat history in the database", async () => {
    const id = parseInt((await request.post("/api/chat")).body.id);
    const n = 3;
    for (let i = 0; i < n; i++) {
      await request
        .post(`/api/chat/${id}`)
        .send({ message: "message" })
        .set("Content-Type", "application/json");
    }
    // we expect twice as many messages as we sent in the history log
    // for each one from us, a response from the llm
    const history = await db.getHistory(id);
    expect(history.length).toEqual(2 * n);
    for (let i = 0; i < history.length; i++) {
      if (i % 2 == 0) {
        expect(history[i].role).toEqual("user");
      } else {
        expect(history[i].role).toEqual("assistant");
      }
    }
  });
});

describe("DELETE /api/chat/:id", () => {
  test("returns 404 for nonexistent chats", async () => {
    const res = await request.delete(`/api/chat/1`);
    expect(res.statusCode).toEqual(404);
  });

  test("deletes existing chats correctly", async () => {
    const id = parseInt((await request.post("/api/chat")).body.id);
    const res = await request.delete(`/api/chat/${id}`);
    expect(res.statusCode).toEqual(200);
    expect((await request.delete(`/api/chat/${id}`)).statusCode).toEqual(404);
  });
});
