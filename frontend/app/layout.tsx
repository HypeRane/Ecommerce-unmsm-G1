import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import { CartProvider } from "@/hooks/useCart";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    template: "%s | UNMSM Store",
    default: "UNMSM Store — E-Commerce Universitario Oficial",
  },
  description:
    "Tienda oficial del curso Taller de Aplicaciones Distribuidas - UNMSM. Productos exclusivos para la comunidad universitaria.",
  keywords: ["UNMSM", "ecommerce", "tienda universitaria", "San Marcos", "productos oficiales"],
  openGraph: {
    title: "UNMSM Store",
    description: "E-Commerce Universitario Oficial",
    type: "website",
    locale: "es_PE",
    siteName: "UNMSM Store",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
