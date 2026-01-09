import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  // Set the x-forwarded-for header for rate limiting
  ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);

  return auth.handler(ctx.request);
};
