export type Links = {
  github: string;
  x: string;
  githubAPI: string;
};

export type SiteConfig = {
  name: string;
  url: string;
  ogImage: string;
  description: string;
  links: Links;
};

export const siteConfig: SiteConfig = {
  name: "Sulaf UI",
  url: "https://sulaf.dev",
  ogImage: "/og.png",
  description:
    "A set of beautifully designed, accessible components for Nuxt & Vue. Built with Tailwind CSS and Reka UI.",
  links: {
    github: "https://github.com/hetari/sulaf-ui",
    x: "https://x.com/hetaridev",
    githubAPI: "https://api.github.com/repos/hetari/sulaf-ui",
  },
};

export default siteConfig;
