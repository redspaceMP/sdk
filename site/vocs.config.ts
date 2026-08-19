import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "RedSpace",
  titleTemplate: "%s · RedSpace",
  description:
    "The official TypeScript SDK for RedSpace — build multiplayer gamemodes for Cyberpunk 2077 roleplay servers.",
  baseUrl: "https://redspace.online",
  basePath: "/docs",
  renderStrategy: "full-static",
  colorScheme: "dark",
  accentColor: "oklch(0.72 0.26 358)",
  logoUrl: "/logo.svg",
  iconUrl: "/logo.svg",
  head: {
    script: [
      { src: "/search.js", defer: true },
      { src: "/footer.js", defer: true },
    ],
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&display=swap",
      },
      { rel: "stylesheet", href: "/styles.css" },
    ],
    meta: [
      {
        name: "theme-color",
        content: "#0b0b10",
      },
      {
        property: "og:site_name",
        content: "RedSpace",
      },
    ],
  },
  socials: [{ icon: "github", link: "https://github.com/redspaceMP/sdk" }],
  editLink: {
    link: "https://github.com/redspaceMP/sdk/edit/main/site/src/pages/:path",
    text: "Edit this page",
  },
  topNav: [
    { text: "Getting Started", link: "/getting-started" },
    { text: "Architecture", link: "/architecture" },
    { text: "API Reference", link: "/api" },
    { text: "Contributing", link: "/contributing" },
    { text: "Roadmap", link: "/roadmap" },
    {
      text: "GitHub",
      link: "https://github.com/redspaceMP/sdk",
      external: true,
    },
  ],
  sidebar: [
    {
      text: "Platform",
      items: [
        { text: "Getting Started", link: "/getting-started" },
        { text: "Architecture", link: "/architecture" },
        { text: "Roadmap", link: "/roadmap" },
      ],
    },
    {
      text: "Packages",
      items: [
        { text: "API Reference", link: "/api" },
        { text: "Contributing", link: "/contributing" },
      ],
    },
    {
      text: "Русский",
      collapsed: true,
      items: [
        { text: "Начало работы", link: "/ru/getting-started" },
        { text: "Архитектура", link: "/ru/architecture" },
        { text: "Дорожная карта", link: "/ru/roadmap" },
        { text: "Справочник API", link: "/ru/api" },
        { text: "Участие в разработке", link: "/ru/contributing" },
      ],
    },
  ],
});
