import { describe, expectTypeOf, test } from "vitest";
import type { FieldPath, FieldPathValue } from "../src/fields/field-path.js";
import type { User } from "./fixtures.js";

/**
 * These are compile-time assertions: `expectTypeOf(...).toEqualTypeOf(...)`
 * is a no-op at runtime (types are erased), so these tests "pass" trivially
 * when run — the actual check happens when this file is type-checked via
 * `pnpm typecheck` (`tsc --noEmit`), which is where an incorrect
 * assertion would surface as a compile error.
 *
 * Membership in the `FieldPath<User>` union is checked via `Extract`
 * rather than `toMatchTypeOf`, since exact-equality (`toEqualTypeOf`) is
 * the one assertion guaranteed stable across `expect-type` versions.
 */

type Includes<Union, Member extends string> = Extract<Union, Member>;

describe("FieldPath", () => {
  test("includes top-level scalar fields", () => {
    expectTypeOf<Includes<FieldPath<User>, "id">>().toEqualTypeOf<"id">();
    expectTypeOf<Includes<FieldPath<User>, "name">>().toEqualTypeOf<"name">();
    expectTypeOf<Includes<FieldPath<User>, "age">>().toEqualTypeOf<"age">();
  });

  test("includes nested object paths", () => {
    expectTypeOf<Includes<FieldPath<User>, "profile.company.name">>().toEqualTypeOf<"profile.company.name">();
    expectTypeOf<Includes<FieldPath<User>, "profile.company.country">>().toEqualTypeOf<"profile.company.country">();
  });

  test("unwraps arrays to their element type", () => {
    expectTypeOf<Includes<FieldPath<User>, "orders.total">>().toEqualTypeOf<"orders.total">();
    expectTypeOf<Includes<FieldPath<User>, "orders.status">>().toEqualTypeOf<"orders.status">();
  });

  test("exposes the collection field itself alongside its element paths", () => {
    expectTypeOf<Includes<FieldPath<User>, "orders">>().toEqualTypeOf<"orders">();
    expectTypeOf<Includes<FieldPath<User>, "profile">>().toEqualTypeOf<"profile">();
  });

  test("treats primitive arrays as leaves, not traversable objects", () => {
    expectTypeOf<Includes<FieldPath<User>, "tags">>().toEqualTypeOf<"tags">();
  });
});

describe("FieldPathValue", () => {
  test("resolves top-level scalar types", () => {
    expectTypeOf<FieldPathValue<User, "id">>().toEqualTypeOf<string>();
    expectTypeOf<FieldPathValue<User, "age">>().toEqualTypeOf<number>();
  });

  test("resolves nested object paths", () => {
    expectTypeOf<FieldPathValue<User, "profile.company.name">>().toEqualTypeOf<string>();
  });

  test("unwraps arrays when resolving a path through them", () => {
    expectTypeOf<FieldPathValue<User, "orders.total">>().toEqualTypeOf<number>();
  });

  test("strips null/undefined from the resolved value", () => {
    expectTypeOf<FieldPathValue<User, "deletedAt">>().toEqualTypeOf<Date>();
    expectTypeOf<FieldPathValue<User, "profile.bio">>().toEqualTypeOf<string>();
  });
});
