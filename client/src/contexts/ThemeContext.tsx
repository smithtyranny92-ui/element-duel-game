import React from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode; defaultTheme?: string }) {
  return <>{children}</>;
}
