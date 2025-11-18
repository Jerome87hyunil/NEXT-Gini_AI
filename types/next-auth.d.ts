import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string;
      organizationSlug: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    organizationId: string;
  }
}
