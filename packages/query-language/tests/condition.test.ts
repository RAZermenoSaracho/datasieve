import { expect, test } from "vitest";
import type { Condition } from "../src/filter/condition.js";
import type { User } from "./fixtures.js";

test("accepts operators valid for the field's type", () => {
  const conditions: Condition<User>[] = [
    { field: "status", op: "=", value: "ACTIVE" },
    { field: "age", op: ">=", value: 18 },
    { field: "name", op: "startsWith", value: "J" },
    { field: "orders.total", op: "between", value: [100, 500] },
    { field: "country", op: "in", value: ["MX", "US"] },
    { field: "profile", op: "isNotNull" },
    { field: "orders", op: "exists" },
  ];

  expect(conditions).toHaveLength(7);
});

test("no-value operators omit `value` entirely", () => {
  // @ts-expect-error isNull never takes a `value`
  const invalid: Condition<User> = { field: "profile", op: "isNull", value: undefined };
  void invalid;
});

test("rejects operators invalid for the field's type", () => {
  // @ts-expect-error "startsWith" is not valid for a number field
  const invalid1: Condition<User> = { field: "age", op: "startsWith", value: "3" };
  // @ts-expect-error ">" is not valid for a string field
  const invalid2: Condition<User> = { field: "name", op: ">", value: "A" };
  void invalid1;
  void invalid2;
});

test("rejects value shapes that don't match the operator", () => {
  // @ts-expect-error "in" requires an array value
  const invalid: Condition<User> = { field: "country", op: "in", value: "MX" };
  void invalid;
});
