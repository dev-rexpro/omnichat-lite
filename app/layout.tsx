
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers";
import "./globals.css"
import "katex/dist/katex.min.css"

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Omnichat",
  description: "AI Chat Interface",
  generator: "v0.app",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><rect width='24' height='24' rx='5' fill='black'/><rect x='7' y='4' width='10' height='16' rx='1.5' stroke='white' strokeWidth='1'/><rect x='4' y='7' width='16' height='10' rx='1.5' stroke='white' strokeWidth='1'/></svg>",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
