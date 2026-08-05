import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/data";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "BRoscars",
  description: "A group video-challenge app — UI prototype.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DataProvider>
          <Header />
          <main className="container">{children}</main>
        </DataProvider>
      </body>
    </html>
  );
}
