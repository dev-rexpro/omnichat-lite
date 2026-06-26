"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, Copy, Download, ChevronDown, ChevronRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FunctionCallDisplayProps {
    functionCall: {
        name: string;
        args: any;
    };
    functionResponse?: any;
    onSendResponse?: (response: string) => void;
}

export function FunctionCallDisplay({
    functionCall,
    functionResponse,
    onSendResponse
}: FunctionCallDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [copied, setCopied] = useState(false)
    const [responseInput, setResponseInput] = useState("")

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(functionCall.args, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(functionCall.args, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${functionCall.name}_args.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div
            className="function-call-box my-4 border rounded-xl overflow-hidden bg-card/40 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
                        fx
                    </div>
                    <span className="font-semibold text-sm">{functionCall.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleDownload} title="Download JSON">
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleCopy} title="Copy JSON">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"}>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Args */}
                    <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs overflow-x-auto text-foreground">
                        <pre>{JSON.stringify(functionCall.args, null, 2)}</pre>
                    </div>

                    {/* Response Section */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground font-medium block mb-2">
                            {functionResponse ? "Response" : "Enter a function response"}
                        </span>

                        {functionResponse ? (
                            <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 p-3 font-mono text-xs overflow-x-auto text-foreground">
                                <pre>{JSON.stringify(functionResponse, null, 2)}</pre>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input
                                    placeholder={`{ "result": ... }`}
                                    className="font-mono text-xs pr-10"
                                    value={responseInput}
                                    onChange={(e) => setResponseInput(e.target.value)}
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-1 top-1 h-7 w-7"
                                    onClick={() => onSendResponse?.(responseInput)}
                                >
                                    <Play className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
