"use client"

import React, { useState, useEffect } from "react"
import { X, Code2, Eye, Download, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCodeRunner } from "@/contexts/code-runner-context"

export function HtmlPreviewPanel() {
    const { code: initialCode, commandTimestamp, closePanel } = useCodeRunner()
    const [code, setCode] = useState(initialCode)
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview')
    const [copied, setCopied] = useState(false)

    // Listen for code updates from the context
    useEffect(() => {
        if (commandTimestamp > 0 && initialCode) {
            setCode(initialCode)
            setActiveTab('preview') // Default to preview when new code is received
        }
    }, [commandTimestamp, initialCode])

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([code], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "canvas_preview.html"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="w-full h-full flex flex-col relative bg-background">
            <div className="absolute top-2 right-3 z-50">
                <Button variant="ghost" size="icon" onClick={closePanel}>
                    <X className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>

            <div className="flex-1 overflow-hidden h-full flex flex-col">
                {/* Header and Tabs */}
                <div className="px-4 pt-3 pb-2 border-b border-border flex items-center justify-between min-h-[50px]">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mr-2">Canvas</span>
                        
                        {/* Tab Selectors */}
                        <div className="flex bg-muted p-0.5 rounded-lg text-xs">
                            <button
                                onClick={() => setActiveTab('code')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${activeTab === 'code' ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Code2 className="w-3.5 h-3.5" />
                                Code
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${activeTab === 'preview' ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                            </button>
                        </div>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1.5 mr-10">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleDownload} title="Download HTML">
                            <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleCopy} title="Copy Code">
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden p-4 relative bg-card/10">
                    {activeTab === 'code' ? (
                        <Textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full font-mono text-sm resize-none p-4 leading-relaxed bg-background border-border"
                            spellCheck={false}
                            placeholder="Enter HTML/CSS/JS code here..."
                        />
                    ) : (
                        <div className="w-full h-full rounded-lg border border-border bg-white overflow-hidden shadow-inner">
                            <iframe
                                srcDoc={code}
                                title="HTML Canvas Preview"
                                className="w-full h-full border-none bg-white"
                                sandbox="allow-scripts allow-modals allow-popups"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
