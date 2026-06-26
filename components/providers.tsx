
"use client";

import React from "react";
import { ThemeProvider } from "./theme-provider";
import { ChatProvider } from "@/hooks/use-chat";
import { SettingsProvider } from "@/hooks/use-settings";
import { AuthProvider } from "@/hooks/use-auth";
import { TooltipProvider } from "./ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={400}>
        <AuthProvider>
          <SettingsProvider>
            <ChatProvider>{children}</ChatProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
