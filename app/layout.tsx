import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalNav from "@/components/nav/global-nav";
import { AuthProvider } from "@/lib/auth-context";
import { AppProvider } from "@/lib/app-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Маркетинговый дашборд",
  description: "Дашборд маркетингового отдела — цели, задачи, проекты, расходы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AppProvider>
            <GlobalNav />
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
