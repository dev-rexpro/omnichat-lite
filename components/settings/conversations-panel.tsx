
"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MessageSquare, Rocket, Lightbulb } from "lucide-react"

interface ConversationsPanelProps {
    pasteLimitation: number;
    setPasteLimitation: (limit: number) => void;
    usePdfAsImage: boolean;
    setUsePdfAsImage: (useAsImage: boolean) => void;
    showPerformanceMetrics: boolean;
    setShowPerformanceMetrics: (show: boolean) => void;
    expandThinking: boolean;
    setExpandThinking: (expand: boolean) => void;
    excludeThinkingOnSubmit: boolean;
    setExcludeThinkingOnSubmit: (exclude: boolean) => void;
}

export function ConversationsPanel({
    pasteLimitation, setPasteLimitation, usePdfAsImage, setUsePdfAsImage, 
    showPerformanceMetrics, setShowPerformanceMetrics, expandThinking, setExpandThinking, 
    excludeThinkingOnSubmit, setExcludeThinkingOnSubmit
}: ConversationsPanelProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /><h3 className="font-semibold">Chat</h3></div>
                <div className="space-y-2">
                    <div className="flex w-full items-center rounded-md border border-input bg-transparent text-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring overflow-hidden h-9">
                        <span className="bg-muted/50 px-3 py-2 text-xs font-medium border-r border-input text-muted-foreground select-none">Paste: limitation</span>
                        <Input type="number" value={pasteLimitation} onChange={e => setPasteLimitation(Number(e.target.value))} className="flex-1 border-0 focus-visible:ring-0 h-auto py-2 text-sm" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">When pasting a long text, it will be converted into a file. You can control the file length by setting the value of this parameter. Set to 0 to disable.</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div>
                        <Label className="font-medium">Use PDF as image instead of text</Label>
                        <p className="text-xs text-muted-foreground">Attach the PDF as an image instead of text. Supported only with multimodal models with vision support.</p>
                    </div>
                    <Switch checked={usePdfAsImage} onCheckedChange={setUsePdfAsImage} />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2"><Rocket className="w-4 h-4" /><h3 className="font-semibold">Performance</h3></div>
                <div className="flex items-start justify-between"><div><Label className="font-medium">Show performance metrics</Label><p className="text-xs text-muted-foreground">Activate to see the processing speed, times, etc.</p></div><Switch checked={showPerformanceMetrics} onCheckedChange={setShowPerformanceMetrics} /></div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4" /><h3 className="font-semibold">Reasoning</h3></div>
                <div className="flex items-start justify-between"><div><Label className="font-medium">Expand thinking section</Label><p className="text-xs text-muted-foreground">Expand thinking message when generating messages</p></div><Switch checked={expandThinking} onCheckedChange={setExpandThinking} /></div>
                <div className="flex items-start justify-between pt-2"><div><Label className="font-medium">Exclude thinking messages on submit</Label><p className="text-xs text-muted-foreground">Exclude thinking messages when sending requests to API (recommended)</p></div><Switch checked={excludeThinkingOnSubmit} onCheckedChange={setExcludeThinkingOnSubmit} /></div>
            </div>
        </div>
    )
}
