import "dotenv/config";
import { auth } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";
import { pool } from "./lib/db";

export const onRequest = defineMiddleware(async (context, next) => {
  // Check for password protection (block overlay)
  // Try both import.meta.env (Astro's way) and process.env (dotenv way)
  const blockPassword = import.meta.env.BLOCK_PASSWORD || process.env.BLOCK_PASSWORD;
  
  // Get the session from the request first (needed for block auth check)
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  // Only enforce block protection if password is set
  if (blockPassword) {
    // Allow the block-auth API endpoint to work
    if (!context.url.pathname.startsWith("/api/block-auth")) {
      // Check for authentication cookie
      const isAuthenticated = context.cookies.get("block_authenticated")?.value === "true";
      
      if (!isAuthenticated) {
        // Allow static assets and public API routes to pass through
        // The overlay will handle blocking on the client side
        // But we can optionally block API routes here too
        const publicApiRoutes = ["/api/auth/", "/api/images/", "/api/block-auth"];
        const isPublicRoute = publicApiRoutes.some(route => context.url.pathname.startsWith(route));
        
        // Allow cart API if user has valid session (logged in users can use cart)
        const isCartApi = context.url.pathname.startsWith("/api/cart/");
        const hasValidSession = session?.user != null;
        
        if (context.url.pathname.startsWith("/api/") && !isPublicRoute && !(isCartApi && hasValidSession)) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        // For pages, let them load but the overlay will block access
      }
    }
  }

  if (session) {
    context.locals.user = session.user;
    context.locals.session = session.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  // Protect admin routes with enhanced security
  if (context.url.pathname.startsWith("/admin")) {
    if (!session?.user) {
      return context.redirect("/auth/login?redirect=" + encodeURIComponent(context.url.pathname));
    }

    // Double-check admin status directly from database to prevent session manipulation
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT "isAdmin", "accountLocked" FROM "user" WHERE id = $1',
          [session.user.id]
        );

        if (result.rows.length === 0) {
          console.warn(`[SECURITY] User not found in database: ${session.user.id}`);
          return new Response("Unauthorized: User not found", { status: 403 });
        }

        const user = result.rows[0];

        // Check if account is locked
        if (user.accountLocked) {
          console.warn(`[SECURITY] Locked account attempted admin access: ${session.user.email}`);
          return new Response("Unauthorized: Account is locked", { status: 403 });
        }

        // Verify admin status from database (not from session)
        if (!user.isAdmin) {
          console.warn(`[SECURITY] Non-admin user attempted admin access: ${session.user.email} from IP: ${context.request.headers.get("x-forwarded-for") || context.clientAddress}`);
          return new Response("Unauthorized: Admin access required", { status: 403 });
        }

        // Log admin access
        console.log(`[ADMIN ACCESS] User: ${session.user.email}, Path: ${context.url.pathname}, IP: ${context.request.headers.get("x-forwarded-for") || context.clientAddress}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("[SECURITY] Database check failed:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return next();
});
