import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Insaaf — evidence for gig workers",
  description:
    "SAM 3.1 checks your photo evidence, Muse Spark drafts the appeal, Muse Voice Transcribe takes your voice note in your own language.",
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="var(--primary)" />
        <path
          d="M14 6.5 20.5 9.5V13c0 4.1-2.6 7.6-6.5 8.9C10.1 20.6 7.5 17.1 7.5 13V9.5L14 6.5Z"
          fill="white"
          fillOpacity="0.92"
        />
        <path
          d="M11.2 14.1 13 15.9l3.8-4"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-extrabold text-lg tracking-tight">Insaaf</span>
    </Link>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Logo />
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/cases"
                className="px-3 py-2 rounded-full hover:bg-primary-tint text-foreground/80 hover:text-primary transition-colors"
              >
                My appeals
              </Link>
              <Link href="/file" className="btn-primary px-4 py-2 text-sm ml-1">
                File a case
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
