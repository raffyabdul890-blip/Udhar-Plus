import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Udhar Plus",
    short_name: "Udhar Plus",
    description:
      "Track customer credit (udhar) and payments — senior-friendly and works offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F8",
    theme_color: "#F7F7F8",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
