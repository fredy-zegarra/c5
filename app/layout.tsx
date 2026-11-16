import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AREQUIPA C5 — Centro de operaciones",
  description: "Centro de Comando, Control, Comunicaciones, Cómputo y Coordinación de la provincia de Arequipa",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0a1017", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
