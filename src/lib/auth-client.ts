import { createAuthClient } from "better-auth/client";
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client";

export const authClient = createAuthClient({
  baseURL: PUBLIC_BETTER_AUTH_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  session,
  user,
} = authClient;
