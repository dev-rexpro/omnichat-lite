
"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function AdditionalSettings() {
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
          Thinking
        </Label>
        <Switch
          checked={isThinkingEnabled}
          onCheckedChange={setIsThinkingEnabled}
          id="thinking-mode"
        />
      </div>
      <div className="h-px bg-border"></div>
      <div className="flex items-center justify-between cursor-pointer group py-1">
        <Label className="text-xs font-bold text-muted-foreground tracking-wider uppercase cursor-pointer group-hover:text-foreground">
          Tools
        </Label>
        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </div>
      <div className="h-px bg-border"></div>
      <div className="flex items-center justify-between cursor-pointer group py-1">
        <Label className="text-xs font-bold text-muted-foreground tracking-wider uppercase cursor-pointer group-hover:text-foreground">
          Advanced Settings
        </Label>
        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </div>
    </div>
  )
}
