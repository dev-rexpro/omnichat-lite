"use client"

import React from "react"
import { ExternalLink, Search } from "lucide-react"

interface GroundingMetadata {
    webSearchQueries?: string[]
    groundingChunks?: Array<{
        web?: {
            uri?: string
            title?: string
        }
    }>
    searchEntryPoint?: {
        renderedContent?: string
    }
}

interface GroundingDisplayProps {
    metadata: GroundingMetadata
}

export function GroundingDisplay({ metadata }: GroundingDisplayProps) {
    if (!metadata) return null

    const sources = (metadata.groundingChunks?.map(chunk => chunk.web).filter(Boolean) || []).slice(0, 5)

    if (sources.length === 0) return null

    return (
        <div className="mt-4 space-y-4 border-t border-border/40 pt-4">

            {/* Sources List */}
            {sources.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Sources</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sources.map((source, i) => (
                            <a
                                key={i}
                                href={source?.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 rounded-lg border border-border/40 bg-card/30 hover:bg-muted/50 transition-colors group"
                                title={source?.title}
                            >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground group-hover:bg-background group-hover:text-primary transition-colors shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                                        {source?.title || "Unknown Source"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate opacity-70">
                                        {source?.uri ? new URL(source.uri).hostname : ""}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Google's rendered suggestions entry point (Optional/Advanced) */}
            {/* 
      {metadata.searchEntryPoint?.renderedContent && (
        <div 
            dangerouslySetInnerHTML={{ __html: metadata.searchEntryPoint.renderedContent }} 
            className="mt-4"
        />
      )} 
      */}
        </div>
    )
}
