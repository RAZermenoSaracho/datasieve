/**
 * A small, deliberately ordinary domain model shared by every example in
 * this directory — DSQL infers everything from shapes like these, so the
 * examples double as a demonstration of the type system against a
 * realistic (if simplified) set of relations.
 */

export interface Company {
  name: string;
  country: string;
}

export interface Profile {
  bio: string | null;
  company: Company;
}

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export interface Order {
  id: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  country: string;
  age: number;
  createdAt: Date;
  deletedAt: Date | null;
  tags: string[];
  profile: Profile;
  orders: Order[];
}
