import type { APIRoute } from "astro";
import "dotenv/config";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    // Try both import.meta.env (Astro's way) and process.env (dotenv way)
    const blockPassword = import.meta.env.BLOCK_PASSWORD || process.env.BLOCK_PASSWORD;

    // Debug log in development
    if (process.env.NODE_ENV === "development" || import.meta.env.DEV) {
      console.log("[BLOCK_AUTH] Checking environment variables:");
      console.log("  - import.meta.env.BLOCK_PASSWORD:", import.meta.env.BLOCK_PASSWORD ? "✓ Set" : "✗ Not set");
      console.log("  - process.env.BLOCK_PASSWORD:", process.env.BLOCK_PASSWORD ? "✓ Set" : "✗ Not set");
      console.log("  - Final blockPassword:", blockPassword ? "✓ Set" : "✗ Not set");
    }

    if (!blockPassword) {
      console.error("[BLOCK_AUTH] ERROR: BLOCK_PASSWORD environment variable is not set!");
      console.error("[BLOCK_AUTH] Please create a .env file in the project root with: BLOCK_PASSWORD=admin123");
      return new Response(
        JSON.stringify({ error: "Passwortschutz nicht konfiguriert" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Compare passwords (case-sensitive, exact match)
    if (password && password.trim() === blockPassword.trim()) {
      // Set a secure cookie that expires in 7 days
      cookies.set("block_authenticated", "true", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Ungültiges Passwort" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Ungültige Anfrage" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  const isAuthenticated = cookies.get("block_authenticated")?.value === "true";
  return new Response(
    JSON.stringify({ authenticated: isAuthenticated }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
