import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PatrimNet — Gestion Patrimoniale Immobilière",
    template: "%s | PatrimNet",
  },
  description: "Plateforme SaaS de gestion patrimoniale immobilière professionnelle",
  keywords: ["patrimoine", "immobilier", "gestion", "SCI", "bail", "locataire"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
