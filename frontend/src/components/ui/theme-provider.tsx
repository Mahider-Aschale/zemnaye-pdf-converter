"use client";

import { ReactNode } from "react";
import { ThemeProvider as NextThemeProvider, ThemeProviderProps as NextThemeProviderProps } from "next-themes";

interface ThemeProviderProps extends Partial<NextThemeProviderProps> {
  children: ReactNode;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider {...props}>
      {children}
    </NextThemeProvider>
  );
}
