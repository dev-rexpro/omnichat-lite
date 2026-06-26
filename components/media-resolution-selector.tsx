
"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function MediaResolutionSelector() {
  const [selectedResolution, setSelectedResolution] = useState("Default")
  const [resolutionDropdownOpen, setResolutionDropdownOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
        Media Resolution
      </Label>
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setResolutionDropdownOpen(!resolutionDropdownOpen)}
          className="h-10 w-full justify-between text-sm shadow-sm"
        >
          <span>{selectedResolution}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
        </Button>
        {resolutionDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-lg">
            <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
              Resolutions
            </div>
            {["Default", "High", "Low"].map((res) => (
              <div
                key={res}
                onClick={() => {
                  setSelectedResolution(res)
                  setResolutionDropdownOpen(false)
                }}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {res}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
