import type { Metadata } from "next";
import { NoirlyHead, noirlyFontClassName } from "@noirly-dev/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noirly Identity",
  description: "Central authentication and SSO for the Noirly ecosystem",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="dark h-full"
      data-theme="gold"
      suppressHydrationWarning
    >
      <head>
        <NoirlyHead themeId="gold" />
      </head>
      <body className={`${noirlyFontClassName} flex min-h-full flex-col antialiased`}>{children}</body>
    </html>
  );
}
