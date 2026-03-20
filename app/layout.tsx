import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
export const metadata: Metadata = {
  title: "Bookaid",
  description: "Trasnform your books into interactive AI conservation.Upload PDFs,and chat with your books using voice. ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body
        suppressHydrationWarning
        className="relative font-sans antialiased"
      >
        <ClerkProvider>
          <Navbar />
          {children}
        </ClerkProvider>
      <Toaster/>
      </body>
    </html>
  );
}
