"use client"

import React, { memo, useMemo, useState, useEffect, useRef } from "react"
import type { Message } from "@/lib/db"
import {
    Copy,
    Check,
    Trash2,
    RotateCcw,
    Pencil,
    Volume2,
    ChevronRight,
    ChevronDown,
    Lightbulb,
    Atom,
    Brain,
    FileIcon,
    Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import MarkdownDisplay from "./markdown-display"
import { useSettings } from "@/hooks/use-settings"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { useTokenCount } from "@/hooks/use-token-count"
import { GroundingDisplay } from "./grounding-display"
import { UrlContextDisplay } from "@/components/url-context-display"
import { addCitations } from "@/lib/grounding-utils"
import { FunctionCallDisplay } from "@/components/function-call-display"



const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
  { id: "gemma-4-26b-a4b-it", name: "Gemma 4 26b A4B IT" },
  { id: "gemma-4-31b-it", name: "Gemma 4 31b IT" },
  { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
  { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
]

const REASONING_MODELS: string[] = []

function isReasoningModel(modelId?: string): boolean {
  return false
}

function getModelName(modelId?: string) {
  if (!modelId) return "";
  return GEMINI_MODELS.find((m) => m.id === modelId)?.name || modelId;
}

interface ChatMessageProps {
    message: Message
    onDelete?: (id: number) => void
    onRegenerate?: () => void
    onEdit?: (id: number, content: string) => void
    isProcessing?: boolean
    onSendFunctionResponse?: (name: string, content: string) => void
}

const THINKING_STEPS = [
  "Analyzing context...",
  "Connecting thoughts...",
  "Finding patterns...",
  "Selecting facts...",
  "Building argument...",
  "Formulating answer...",
]

const ThinkingSection = memo(function ThinkingSection({ content, isThinking }: { 
    content: string, 
    isThinking?: boolean,
}) {
    const { settings } = useSettings()
    const [isOpen, setIsOpen] = useState(settings.expandThinking)
    const contentText = typeof content === 'string' ? content : String(content || "");
    const [stepIndex, setStepIndex] = useState(0)
    const [fadeKey, setFadeKey] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isThinking) {
            intervalRef.current = setInterval(() => {
                setStepIndex((prev) => (prev + 1) % THINKING_STEPS.length)
                setFadeKey((prev) => prev + 1)
            }, 2000)
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isThinking])

    if (!contentText) return null

    return (
        <>
            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; transform: translateX(-4px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
            `}</style>
            <div className="w-full mb-4 group/thinking message-in">
            <Collapsible 
                open={isOpen} 
                onOpenChange={setIsOpen} 
                className={cn(
                    "overflow-hidden transition-all duration-250 transition-[width] border-l-2 border-muted-foreground/40 bg-muted",
                    isOpen ? "w-full" : "w-[280px]"
                )}
            >
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "flex items-center justify-between h-8 px-3 select-none whitespace-nowrap transition-[width]",
                            "hover:bg-muted/80",
                            isOpen ? "w-full" : "w-[280px]"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {isThinking ? (
                                <div className="w-[3px] h-4 bg-foreground/70" style={{ animation: 'blink 1s step-end infinite' }} />
                            ) : (
                                <Lightbulb className="w-3.5 h-3.5 text-foreground" />
                            )}
                            <span key={fadeKey} className="text-[12px] font-medium text-foreground/80" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                                {isThinking ? THINKING_STEPS[stepIndex] : "Reasoning Chain"}
                            </span>
                        </div>
                        <div className={cn(
                            "flex items-center",
                            isOpen ? "absolute right-2" : ""
                        )}>
                            {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        </div>
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 py-3 text-[13.5px] leading-relaxed text-muted-foreground/90 font-sans select-text bg-background">
                        <MarkdownDisplay content={contentText} />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
        </>
    )
})

export const ChatMessage = memo(function ChatMessage({
    message,
    onDelete,
    onRegenerate,
    onEdit,
    isProcessing,
    onSendFunctionResponse
}: ChatMessageProps) {
    const { settings } = useSettings()
    const [copied, setCopied] = useState(false)
    const isAssistant = message.role === "assistant"
    const isUser = message.role === "user"
    const hasFunctionCalls = message.functionCalls && message.functionCalls.length > 0

    // Guaranteed string content
    const contentText = useMemo(() => {
        if (typeof message.content === 'string') return message.content;
        return String(message.content ?? "");
    }, [message.content]);

    const messageContentToCount = useMemo(() => {
        return (contentText || "") + (message.reasoning_content || "");
    }, [contentText, message.reasoning_content]);

    const { count: tokenCount, isLoading: isCountingTokens } = useTokenCount(
        messageContentToCount,
        message.model || settings.model,
        settings.apiKeys[settings.provider],
        settings.provider
    )

    const handleCopy = () => {
        navigator.clipboard.writeText(contentText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const timeString = useMemo(() => {
        try {
            const date = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
            if (isNaN(date.getTime())) return "";
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }).format(date)
        } catch (e) {
            return ""
        }
    }, [message.createdAt])

    const { isPlaying, play, stop } = useTextToSpeech({
        text: contentText
    })

    const handleSpeak = () => {
        if (isPlaying) {
            stop()
        } else {
            play()
        }
    }



    // ... existing initialization ...

    return (
        <div className={cn(
            "group flex flex-col gap-1 w-full mb-8 px-2 message-in",
            isUser ? "items-end" : "items-start"
        )}>
            {/* Metadata Header */}
            <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground/50 mb-1">
                {isAssistant && (
                    <>
                        <span className="font-bold text-primary/70">
                            {getModelName(message.model || settings.model)}
                        </span>
                        {timeString && <span>{timeString}</span>}
                        <span>|</span>
                        <span className={cn(isCountingTokens && "opacity-50")}>
                            {tokenCount.toLocaleString()} Token
                        </span>
                    </>
                )}
                {isUser && (
                    <>
                        {timeString && <span>{timeString}</span>}
                        <span>|</span>
                        <span className={cn(isCountingTokens && "opacity-50")}>
                            {tokenCount.toLocaleString()} Token
                        </span>
                    </>
                )}
            </div>

            <div className={cn(
                "relative flex flex-col gap-2",
                isUser
                    ? "items-end max-w-[85%] sm:max-w-[75%]"
                    : cn("items-start max-w-[98%]", hasFunctionCalls && "w-[98%]")
            )}>
                <div className={cn(
                    "rounded-2xl transition-all duration-200 break-words",
                    isUser
                        ? "bg-secondary text-secondary-foreground px-5 py-3 rounded-tr-[2px]"
                        : "max-w-[98%] w-full py-0 px-1 bg-transparent shadow-none"
                )}>
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className={cn(
                            "flex flex-wrap gap-2 mb-3",
                            isUser ? "justify-end" : "justify-start"
                        )}>
                            {message.attachments.map((att, i) => (
                                <div key={i} className="max-w-[240px] rounded-xl border border-border/40 overflow-hidden bg-card/30 shadow-sm">
                                    {att.type.startsWith('image/') ? (
                                        <div className="relative group/att cursor-pointer">
                                            <img
                                                src={att.data}
                                                alt={att.name}
                                                className="max-h-[300px] w-auto h-auto object-contain"
                                                onClick={() => window.open(att.data, '_blank')}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 min-w-[180px]">
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <FileIcon className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <span className="text-[13px] font-medium truncate" title={att.name}>{att.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{att.type.split('/')[1] || 'FILE'}</span>
                                            </div>
                                            <a
                                                href={att.data}
                                                download={att.name}
                                                className="ml-auto p-2 hover:bg-muted rounded-full transition-colors shrink-0"
                                            >
                                                <Download className="w-4 h-4 text-muted-foreground" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Assistant Reasoning - Show whenever reasoning_content exists */}
                    {isAssistant && message.reasoning_content && message.reasoning_content.trim() && (
                        <ThinkingSection 
                            content={message.reasoning_content!} 
                            isThinking={isProcessing && !contentText}
                        />
                    )}

                    {/* Message Content */}
                    <div className={cn(
                        "text-[15px] leading-relaxed select-text min-h-[1.5em]",
                        !contentText && isAssistant && isProcessing && "py-2 px-4"
                    )}>
                        {contentText.trim() ? (
                            (isUser ? settings.displayUserMessagesRaw : settings.displayModelMessagesRaw) ? (
                                <pre className="whitespace-pre-wrap font-sans text-[14px]">{contentText}</pre>
                            ) : (
                                <MarkdownDisplay content={(() => {
                                    // Process citations using grounding metadata
                                    if (message.groundingMetadata?.groundingSupports) {
                                        return addCitations(contentText, message.groundingMetadata);
                                    }

                                    // Fallback if support indices are missing but chunks exist (regex replacement)
                                    // This handles cases where text MIGHT have brackets but no precise indices
                                    if (message.groundingMetadata?.groundingChunks) {
                                        const chunks = message.groundingMetadata.groundingChunks;
                                        return contentText.replace(/\[(\d+)\]/g, (match, n) => {
                                            const index = parseInt(n) - 1;
                                            if (chunks[index]?.web?.uri) {
                                                return `[[${n}]](${chunks[index].web.uri})`;
                                            }
                                            return match;
                                        });
                                    }

                                    return contentText;
                                })()} />
                            )
                        ) : (
                            isAssistant && isProcessing && (
                                <div className="flex gap-1.5 items-center ml-4">
                                    <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                                </div>
                            )
                        )}
                    </div>

                    {/* Grounding Display (Sources & Suggestions) */}
                    {isAssistant && message.groundingMetadata && (
                        <GroundingDisplay metadata={message.groundingMetadata} />
                    )}

                    {/* URL Context Display */}
                    {isAssistant && message.urlContextMetadata && (
                        <UrlContextDisplay metadata={message.urlContextMetadata} />
                    )}

                    {/* Function Calls Display */}
                    {isAssistant && message.functionCalls && (
                        <div className="w-full flex flex-col gap-2 mt-2">
                            {message.functionCalls.map((call, idx) => (
                                <FunctionCallDisplay
                                    key={idx}
                                    functionCall={call}
                                    functionResponse={message.functionResponses?.[idx]}
                                    onSendResponse={onSendFunctionResponse ? (response) => onSendFunctionResponse(call.name, response) : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className={cn(
                    "flex items-center gap-0.5 mt-1 transition-opacity",
                    "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                    isUser && "flex-row-reverse"
                )}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted" onClick={handleCopy}>
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/70" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Copy</TooltipContent>
                    </Tooltip>

                    {isAssistant && onRegenerate && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted" onClick={onRegenerate}>
                                    <RotateCcw className="w-3.5 h-3.5 text-muted-foreground/70" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Regenerate</TooltipContent>
                        </Tooltip>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted" onClick={() => onEdit?.(message.id!, contentText)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground/70" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete?.(message.id!)}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "w-7 h-7 hover:bg-muted transition-colors",
                                    isPlaying && "text-primary bg-primary/10 hover:bg-primary/20"
                                )}
                                onClick={handleSpeak}
                            >
                                <Volume2 className={cn("w-3.5 h-3.5", isPlaying ? "text-primary animate-pulse" : "text-muted-foreground/70")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isPlaying ? "Stop Speaking" : "Read Aloud"}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    )
})
