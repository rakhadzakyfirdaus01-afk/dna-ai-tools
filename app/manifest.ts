import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DNA AI Platform",
    short_name: "DNA AI",
    description: "AI Advertising Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo-dna.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}