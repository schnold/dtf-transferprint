// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";
import { fileURLToPath } from "url";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [tailwind()],
  env: {
    schema: {
      PUBLIC_BETTER_AUTH_URL: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "http://localhost:4321",
      }),
    },
  },
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});