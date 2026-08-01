import { expect, test } from "vitest";
import type { WhereInput } from "../src/filter/where.js";
import type { User } from "./fixtures.js";

test("supports unbounded and/or/not nesting", () => {
  const where: WhereInput<User> = {
    and: [
      { field: "status", op: "=", value: "ACTIVE" },
      {
        or: [
          { field: "country", op: "=", value: "MX" },
          { field: "country", op: "=", value: "US" },
        ],
      },
      { not: { field: "deletedAt", op: "isNotNull" } },
      {
        not: {
          or: [{ and: [{ field: "age", op: "<", value: 18 }] }, { field: "status", op: "=", value: "INACTIVE" }],
        },
      },
    ],
  };

  expect(where).toBeTypeOf("object");
});
