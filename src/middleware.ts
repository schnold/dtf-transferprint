import "dotenv/config";
import { auth } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";
import { pool } from "./lib/db";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getAllowedOrigins(request: Request, currentUrl: URL): Set<string> {
  const origins = new Set<string>();
  const envOrigins = [
    process.env.BETTER_AUTH_URL,
    process.env.PUBLIC_BETTER_AUTH_URL,
  ].filter((value): value is string => Boolean(value));

  for (const origin of envOrigins) {
    origins.add(origin.replace(/\/+$/, ""));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProto || currentUrl.protocol.replace(":", "");
    origins.add(`${protocol}://${host}`);
  }

  return origins;
}

function applySecurityHeaders(response: Response, requestUrl: URL): void {
  const headers = response.headers;

  if (!headers.has("X-Frame-Options")) {
    headers.set("X-Frame-Options", "DENY");
  }
  if (!headers.has("X-Content-Type-Options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!headers.has("Referrer-Policy")) {
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (!headers.has("Permissions-Policy")) {
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
  }
  if (requestUrl.protocol === "https:" && !headers.has("Strict-Transport-Security")) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware entirely for static/prerendered content pages
  // These pages don't need auth checks and will be generated at build time
  const staticContentPaths = ['/themen/', '/arbeitskleidung/'];
  const isStaticContent = staticContentPaths.some(path => context.url.pathname.startsWith(path));

  if (isStaticContent) {
    // Skip all middleware processing for static content
    const response = await next();
    applySecurityHeaders(response, context.url);
    return response;
  }

  const isApiRequest = context.url.pathname.startsWith("/api/");
  const isCronRoute = context.url.pathname.startsWith("/api/cron/");

  // Enforce same-origin requests for state-changing API operations to reduce CSRF risk.
  if (isApiRequest && !isCronRoute && MUTATING_METHODS.has(context.request.method)) {
    const origin = context.request.headers.get("origin");
    const allowedOrigins = getAllowedOrigins(context.request, context.url);
    if (!origin || !allowedOrigins.has(origin.replace(/\/+$/, ""))) {
      const blockedResponse = new Response(
        JSON.stringify({ error: "Forbidden origin" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
      applySecurityHeaders(blockedResponse, context.url);
      return blockedResponse;
    }
  }

  // Check for password protection (block overlay)
  // Try both import.meta.env (Astro's way) and process.env (dotenv way)
  const blockPassword = import.meta.env.BLOCK_PASSWORD || process.env.BLOCK_PASSWORD;

  // Get the session from the request
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
          const unauthorizedResponse = new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
          applySecurityHeaders(unauthorizedResponse, context.url);
          return unauthorizedResponse;
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
          const unauthorizedResponse = new Response("Unauthorized: User not found", { status: 403 });
          applySecurityHeaders(unauthorizedResponse, context.url);
          return unauthorizedResponse;
        }

        const user = result.rows[0];

        // Check if account is locked
        if (user.accountLocked) {
          console.warn(`[SECURITY] Locked account attempted admin access: User ID ${session.user.id}`);
          const unauthorizedResponse = new Response("Unauthorized: Account is locked", { status: 403 });
          applySecurityHeaders(unauthorizedResponse, context.url);
          return unauthorizedResponse;
        }

        // Verify admin status from database (not from session)
        if (!user.isAdmin) {
          // Log security incident without exposing full email (use ID instead)
          console.warn(`[SECURITY] Non-admin attempted admin access: User ID ${session.user.id}, Path: ${context.url.pathname}`);
          const unauthorizedResponse = new Response("Unauthorized: Admin access required", { status: 403 });
          applySecurityHeaders(unauthorizedResponse, context.url);
          return unauthorizedResponse;
        }

        // Log admin access without exposing sensitive PII
        // In production, send these to a secure audit log service
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ADMIN ACCESS] User ID: ${session.user.id}, Path: ${context.url.pathname}`);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("[SECURITY] Database check failed:", error);
      const errorResponse = new Response("Internal Server Error", { status: 500 });
      applySecurityHeaders(errorResponse, context.url);
      return errorResponse;
    }
  }

  const response = await next();
  applySecurityHeaders(response, context.url);
  return response;
});
