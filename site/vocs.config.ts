import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "RedSpaceM SDK",
  description: "Build multiplayer gamemodes for Cyberpunk 2077 servers.",
  basePath: "/redspacem",
  baseUrl: "https://waveluv.github.io",
  renderStrategy: "full-static",
  colorScheme: "dark",
  logoUrl: "/logo.svg",
  iconUrl: "/logo.svg",
  socials: [{ icon: "github", link: "https://github.com/waveluv/redspacem" }],
  topNav: [
    { text: "Getting Started", link: "/getting-started" },
    { text: "Architecture", link: "/architecture" },
    { text: "API", link: "/api" },
    { text: "Contributing", link: "/contributing" },
    { text: "Roadmap", link: "/roadmap" },
    {
      text: "GitHub",
      link: "https://github.com/waveluv/redspacem",
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
