import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Body/UI sans and an editorial serif for display headings. next/font
// self-hosts both, so no runtime request goes to Google.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wedding Placement Planner",
  description:
    "Plan where every decor and stationery item goes at the wedding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${cormorant.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
