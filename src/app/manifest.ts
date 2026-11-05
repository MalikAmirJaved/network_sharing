import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Netword — Share anything on your network",
    short_name: "Netword",
    description:
      "Private, instant file and text sharing across the devices on your local network.",
    start_url: "/",
    display: "standalone",
    background_color: "#05080f",
    theme_color: "#05080f",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
