import { PrismaClient } from "@prisma/client";

/**
 * Runs once, in a separate process, before the whole test file run
 * starts (see `globalSetup` in `vitest.config.ts`). The database schema
 * itself is already fresh at this point (`pnpm test` runs `prisma db
 * push --force-reset` before invoking vitest) — this just seeds a small,
 * fixed dataset every test file can rely on.
 *
 * Seeded with a deliberate mix: a soft-deleted user, a user with no
 * profile, a user with no orders, nullable `bio`, and enough orders per
 * user to exercise sorting/pagination/aggregation meaningfully.
 */
export default async function setup(): Promise<void> {
  const prisma = new PrismaClient();

  await prisma.order.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      id: "user-ada",
      name: "Ada Lovelace",
      email: "ada@example.com",
      status: "ACTIVE",
      age: 30,
      bio: "Mathematician",
      profile: { create: { id: "profile-ada", region: "west" } },
      orders: {
        create: [
          { id: "order-ada-1", total: 100, status: "PAID", createdAt: new Date("2024-01-01") },
          { id: "order-ada-2", total: 250, status: "PENDING", createdAt: new Date("2024-02-01") },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "user-grace",
      name: "Grace Hopper",
      email: "grace@example.com",
      status: "INACTIVE",
      age: 45,
      bio: null,
      profile: { create: { id: "profile-grace", region: "east" } },
      orders: { create: [{ id: "order-grace-1", total: 500, status: "PAID", createdAt: new Date("2024-03-01") }] },
    },
  });

  await prisma.user.create({
    data: {
      id: "user-linus",
      name: "Linus Torvalds",
      email: "linus@example.com",
      status: "ACTIVE",
      age: 25,
      bio: "Kernel hacker",
      deletedAt: new Date("2024-06-01"),
      profile: { create: { id: "profile-linus", region: "west" } },
    },
  });

  await prisma.user.create({
    data: {
      id: "user-margaret",
      name: "Margaret Hamilton",
      email: "margaret@example.com",
      status: "ACTIVE",
      age: 50,
      bio: null,
      orders: {
        create: [
          { id: "order-margaret-1", total: 75, status: "CANCELLED", createdAt: new Date("2024-04-01") },
          { id: "order-margaret-2", total: 300, status: "PAID", createdAt: new Date("2024-05-01") },
        ],
      },
    },
  });

  await prisma.$disconnect();
}
