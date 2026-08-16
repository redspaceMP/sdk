import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "RedSpaceM SDK",
  description: "Build multiplayer gamemodes for Cyberpunk 2077 servers.",
  baseUrl: "https://redspace.online",
  renderStrategy: "full-static",
  colorScheme: "dark",
  logoUrl: "/logo.svg",
  iconUrl: "/logo.svg",
  head: {
    script: [{ src: "/search.js", defer: true }],
  },
  socials: [{ icon: "github", link: "https://github.com/redspaceMP/sdk" }],
  topNav: [
    { text: "Getting Started", link: "/getting-started" },
    { text: "Architecture", link: "/architecture" },
    { text: "API", link: "/api" },
    { text: "Contributing", link: "/contributing" },
    { text: "Roadmap", link: "/roadmap" },
    {
      text: "GitHub",
      link: "https://github.com/redspaceMP/sdk",
      external: true,
    },
  ],
  sidebar: [
    { text: "Getting Started", link: "/getting-started" },
    { text: "Architecture", link: "/architecture" },
    { text: "API Reference", link: "/api" },
    { text: "Contributing", link: "/contributing" },
    { text: "Roadmap", link: "/roadmap" },
    {
      text: "Русский",
      collapsed: true,
      items: [
        { text: "Начало работы", link: "/ru/getting-started" },
        { text: "Архитектура", link: "/ru/architecture" },
        { text: "Справочник API", link: "/ru/api" },
        { text: "Участие в разработке", link: "/ru/contributing" },
        { text: "Дорожная карта", link: "/ru/roadmap" },
      ],
    },
  ],
});
