/**
 * Basic filtering: a single `field`/`op`/`value` condition.
 *
 * `field` autocompletes over every valid dot-notation path on `User`.
 * Once `field` is chosen, `op` is narrowed to operators valid for that
 * field's type, and `value` is narrowed to match.
 */
import type { Condition, DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const activeUsers: DataSieveQuery<User> = {
  where: { field: "status", op: "=", value: "ACTIVE" },
};

const adults: DataSieveQuery<User> = {
  where: { field: "age", op: ">=", value: 18 },
};

const mexicansOrAmericans: DataSieveQuery<User> = {
  where: { field: "country", op: "in", value: ["MX", "US"] },
};

// A standalone condition can also be typed on its own.
const nameStartsWithJ: Condition<User> = { field: "name", op: "startsWith", value: "J" };

// @ts-expect-error "startsWith" is not a valid operator for a number field.
const _invalid: Condition<User> = { field: "age", op: "startsWith", value: "3" };

export { activeUsers, adults, mexicansOrAmericans, nameStartsWithJ };
