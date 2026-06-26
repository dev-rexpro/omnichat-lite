
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError("")
    setAuthLoading(true)

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string) || '';
    const nameInput = (formData.get('name') as string) || '';

    // Simulate network delay
    setTimeout(() => {
      // For now, any login works as we use mock auth
      // In a real app, we would validate credentials here

      // Logic to pick username:
      const username = !isLoginMode && nameInput ? nameInput : (email ? email.split('@')[0] : "User");

      login(username);
      // Redirect handled by useEffect
    }, 800)
  }

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="12" height="20" x="6" y="2" rx="2" />
              <rect width="20" height="12" x="2" y="6" rx="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isLoginMode ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoginMode ? "Enter your credentials to access your chats" : "Enter your details to get started"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginMode && (
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input type="text" name="name" placeholder="John Doe" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" name="email" placeholder="name@example.com" required />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" name="password" placeholder="••••••••" required />
              </div>

              {authError && (
                <div className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">{authError}</div>
              )}

              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? "Processing..." : isLoginMode ? "Sign In" : "Sign Up"}
              </Button>
            </form>
          </div>

          <div className="px-8 py-4 bg-muted/50 border-t border-border flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              <span>{isLoginMode ? "Don't have an account? " : "Already have an account? "}</span>
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-primary font-medium hover:underline underline-offset-4 focus:outline-none"
              >
                {isLoginMode ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground px-8">
          By clicking continue, you agree to our{" "}
          <a href="#" className="underline hover:text-primary">Terms of Service</a> and{" "}
          <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
