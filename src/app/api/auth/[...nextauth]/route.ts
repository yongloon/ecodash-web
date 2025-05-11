// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma"; // Your Prisma client instance
import bcrypt from "bcrypt";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        // Use email or username for login. Let's use email for consistency with Google.
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          // User not found or doesn't have a password (e.g., signed up with Google)
          throw new Error("Invalid credentials");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Invalid credentials");
        }

        // Return user object that NextAuth expects
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          // username: user.username // if you want to include it in the session/JWT
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Using JWT for sessions
  },
  pages: {
    signIn: "/login", // Your custom login page
    // error: '/auth/error', // Optional: Custom error page for auth errors
    // newUser: '/welcome' // Optional: Redirect new users to a welcome page
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID and other custom fields to the JWT token
      if (user) {
        token.id = user.id;
        // token.username = user.username; // if you have username in User model and return it from authorize
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID and other custom fields to the session object
      if (session.user && token.id) {
        (session.user as any).id = token.id; // Cast to any to add id
        // (session.user as any).username = token.username;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // IMPORTANT!
  // debug: process.env.NODE_ENV === "development", // Optional: for debugging
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };