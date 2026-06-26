
"use client"

import type React from "react"
import { FlaskConical } from "lucide-react"

export function AdvancedPanel() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="bg-muted/50 p-4 rounded-full">
                <FlaskConical className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <div className="space-y-2 max-w-[280px]">
                <h3 className="font-semibold text-lg">Work in Progress</h3>
                <p className="text-sm text-muted-foreground">
                    The settings for presets are currently being developed and will be available in a future update.
                </p>
            </div>
        </div>
    )
}
