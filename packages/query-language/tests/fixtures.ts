export interface Company {
  name: string;
  country: string;
}

export interface Profile {
  bio: string | null;
  company: Company;
}

export interface Order {
  id: string;
  total: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  country: string;
  age: number;
  createdAt: Date;
  deletedAt: Date | null;
  tags: string[];
  profile: Profile;
  orders: Order[];
}
