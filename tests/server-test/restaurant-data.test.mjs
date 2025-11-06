import { test, expect } from "@jest/globals";
import { getRestaurantData, N_ITEMS, randomSublist } from "../../src/server/restaurant-data.mjs";

describe("getRestaurantData()", () => {
  test("returns valid JSON list (stringified)", async () => {
    const res = await getRestaurantData();
    expect(typeof res).toBe("string");
    expect(Array.isArray(JSON.parse(res))).toBe(true);
  });

  test("returns the expected number of items", async () => {
    expect(JSON.parse(await getRestaurantData()).length).toBe(N_ITEMS);
  });

  test("returns different random items each time", async () => {
    const r1 = await getRestaurantData();
    const r2 = await getRestaurantData();

    expect(r1 == r2).toBe(false);
  });
});

describe("randomSublist()", () => {
  test("returns the original list if n >= l.length", () => {
    const l = [1, 2, 3];
    expect(randomSublist(l, 10)).toEqual(l);
  });
});
