import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { cookies } from "next/headers";
import { Proveedores } from "@/components/bona/proveedores";
import "./globals.css";

const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Bonadent", template: "%s · Bonadent" },
  description: "Gestión de la clínica dental: agenda, pacientes, caja y cotizaciones.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1c1e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = (await cookies()).get("bona_tema")?.value === "light" ? "light" : "dark";
  return (
    <html lang="es-DO" data-theme={tema} className={`${urbanist.variable} h-full`}>
      <body className="min-h-full">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
