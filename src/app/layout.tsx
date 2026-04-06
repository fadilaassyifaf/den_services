// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

import { ProgressProvider } from "@/shared/context/progress-context";
import { AuthProvider } from "@/shared/context/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FTTX Design and Engineering",
  description: "Tower Bersama Group - FTTX Design and Engineering Services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased bg-[#F8FAFC]`}>
        <AuthProvider>        {/* ← tambahan */}
          <ProgressProvider>
            {children}
          </ProgressProvider>
        </AuthProvider>       {/* ← tambahan */}
      </body>
    </html>
  );
}