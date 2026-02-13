// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import { fileURLToPath } from "url";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
    host: true,
  },
  integrations: [tailwind()],
  image: {
    // Enable image optimization
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.gorfactory.es"
      }
    ]
  },
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