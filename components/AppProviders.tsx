"use client";

import type { ReactNode } from "react";
import { DEFAULT_THEME_ID } from "@noirly-dev/ui";
import { ThemeProvider } from "@/components/ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultThemeId={DEFAULT_THEME_ID}>{children}</ThemeProvider>;
}
