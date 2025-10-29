/**
 * @jest-environment node
 */

import { beforeEach, expect, jest, test } from "@jest/globals";
import { factory } from "./mock-ollama.mjs";
import request from "supertest";

// mock ollama to avoid long API calls
jest.unstable_mockModule("ollama", factory);

const app = await import("../../src/app.mjs");

test("static homepage content is served", async () => {
  const res = await request(app.app).get("/");
  expect(res.statusCode).toEqual(200);
  expect(res.text).toMatch(/^<!DOCTYPE html>/);
});
