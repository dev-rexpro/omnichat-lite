import React from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

interface UrlMetadata {
    retrieved_url: string;
    url_retrieval_status: string;
}

interface UrlContextDisplayProps {
    metadata: {
        url_metadata?: UrlMetadata[];
    };
    className?: string;
}

export function UrlContextDisplay({ metadata, className }: UrlContextDisplayProps) {
    if (!metadata?.url_metadata || metadata.url_metadata.length === 0) {
        return null;
    }

    return (
        <div className={cn("flex flex-col gap-2 mt-4 pt-4 border-t border-border/50", className)}>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>URL Context Sources</span>
            </div>
            <div className="grid gap-2">
                {metadata.url_metadata.map((item, index) => {
                    const isSuccess = item.url_retrieval_status === 'URL_RETRIEVAL_STATUS_SUCCESS';
                    return (
                        <a
                            key={index}
                            href={item.retrieved_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "group flex items-center justify-between p-2.5 rounded-lg border bg-card/50 hover:bg-accent/50 transition-all duration-200 text-sm no-underline",
                                "border-border/50 hover:border-border"
                            )}
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className={cn(
                                    "flex-shrink-0 w-1.5 h-1.5 rounded-full",
                                    isSuccess ? "bg-green-500" : "bg-destructive"
                                )} />
                                <span className="truncate text-foreground/90 group-hover:text-primary font-medium transition-colors">
                                    {item.retrieved_url}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pl-3 flex-shrink-0 text-muted-foreground">
                                <span className="text-[10px] hidden sm:inline-block opacity-70">
                                    {isSuccess ? 'Retrieved' : 'Failed'}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
