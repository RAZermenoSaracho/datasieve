/** Mirrors `prisma/schema.prisma` for typing DSQL queries in tests. */

export interface Profile {
  id: string;
  region: string;
  userId: string;
}

export interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  age: number;
  bio: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  profile: Profile | null;
  orders: Order[];
}
