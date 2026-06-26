
"use client"

import type React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function SystemPrompt() {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
        System Instruction
      </Label>
      <Textarea
        className="min-h-[90px] resize-y border border-input shadow-sm bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="You are a helpful assistant."
      />
       <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">Token count</span>
        <span className="text-muted-foreground font-mono text-xs">16 / 1,048,576</span>
      </div>
    </div>
  )
}
