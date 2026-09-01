import type { Metadata } from "next";
import { ThemeStyles, noirlyFontClassName } from "@noirly-dev/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noirly Identity",
  description: "Central authentication and SSO for the Noirly ecosystem",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${noirlyFontClassName} dark h-full`}
      data-theme="gold"
      suppressHydrationWarning
    >
      <head>
        <ThemeStyles themeId="gold" />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
