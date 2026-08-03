/** Mirrors `prisma/schema.prisma`'s `User` model for typing DSQL queries in these examples. */
export interface User {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  age: number;
  createdAt: Date;
  deletedAt: Date | null;
}
