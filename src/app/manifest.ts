import type { MetadataRoute } from "next";

/**
 * Web app manifest: «Προσθήκη στην οθόνη Αφετηρίας». Στο iPhone οι ειδοποιήσεις
 * (Web Push) λειτουργούν μόνο όταν η εφαρμογή ανοίγει από εκεί.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyPhysics",
    short_name: "MyPhysics",
    description: "Φυσική — θεωρία, ασκήσεις, quiz και συνομιλία με τον καθηγητή.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f1c",
    theme_color: "#0a0f1c",
    lang: "el",
    icons: [{ src: "/login_logo.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
