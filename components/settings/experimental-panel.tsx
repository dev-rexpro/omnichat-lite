
"use client"

import type React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ExperimentalPanelProps {
    enablePythonInterpreter: boolean;
    setEnablePythonInterpreter: (enabled: boolean) => void;
}

export function ExperimentalPanel({
    enablePythonInterpreter,
    setEnablePythonInterpreter
}: ExperimentalPanelProps) {
    return (
        <div className="space-y-6">
            <div className="text-sm text-muted-foreground space-y-2">
                <p>Experimental features are not guaranteed to work correctly.</p>
                <p>If you encounter any problems, create a <a href="#" className="underline">Bug report on Github</a>. Please also specify <strong>experimental</strong> on the report title and include screenshots.</p>
                <p>Some features may require packages downloaded from CDN, so they need internet connection.</p>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div>
                    <Label className="font-medium">Enable Python interpreter</Label>
                    <p className="text-xs text-muted-foreground max-w-sm pt-1">
                        This feature uses <a href="#" className="underline">pyodide</a>, downloaded from CDN. To use this feature, ask the LLM to generate Python code inside a Markdown code block. You will see a "Run" button on the code block, near the "Copy" button.
                    </p>
                </div>
                <Switch
                    checked={enablePythonInterpreter}
                    onCheckedChange={setEnablePythonInterpreter}
                />
            </div>

            <div className="pt-4 text-xs text-muted-foreground space-y-1">
                <p>Application Version: 2.38.2</p>
                <p>Settings are saved in browser's localStorage.</p>
            </div>
        </div>
    )
}
