import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

export default defineConfig({
  vite: () => ({
    plugins: [react() as any],
  }),
  manifest: {
    name: "Otaku Tab - Aesthetic Theme & Music Studio",
    description: "Customize your new tab with wallpapers, widgets for Gamers, Traders & Corporate, and background YouTube music controller.",
    version: "1.2.0",
    permissions: [
      "storage",
      "bookmarks",
      "favicon",
      "tabs",
      "scripting"
    ],
    host_permissions: [
      "*://*.youtube.com/*",
      "*://api.binance.com/*",
      "*://api.coingecko.com/*"
    ],
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    },
    action: {
      default_title: "Otaku Tab Controls",
      default_icon: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png"
      }
    }
  }
});
