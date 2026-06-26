
"use client"

import type React from "react"
import { Slider } from "@/components/ui/slider"

interface TemperatureSelectorProps {
  value: number[]
  onValueChange: (value: number[]) => void
}

export function TemperatureSelector({ value, onValueChange }: TemperatureSelectorProps) {
  // Ensure value is always a single number for display
  const displayValue = Array.isArray(value) ? value[0] : value;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Temperature</span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={value}
          onValueChange={onValueChange}
          className="w-full"
        />
        <div className="bg-accent px-3 py-1 rounded-md text-sm border border-border w-12 text-center">
          {/* Format the number to one decimal place, using a comma */}
          {displayValue.toFixed(1).replace(".", ",")}
        </div>
      </div>
    </div>
  )
}
