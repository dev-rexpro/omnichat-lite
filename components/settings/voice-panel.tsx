
"use client"

import type React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ChevronDown, AudioLines, Volume2 } from "lucide-react"

interface VoicePanelProps {
    selectedVoice: string;
    setSelectedVoice: (voice: string) => void;
    voiceDropdownOpen: boolean;
    setVoiceDropdownOpen: (isOpen: boolean) => void;
    voices: string[];
    pitch: number;
    setPitch: (pitch: number) => void;
    rate: number;
    setRate: (rate: number) => void;
    volume: number;
    setVolume: (volume: number) => void;
}

export function VoicePanel({
    selectedVoice, setSelectedVoice, voiceDropdownOpen, setVoiceDropdownOpen, voices,
    pitch, setPitch, rate, setRate, volume, setVolume
}: VoicePanelProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2"><AudioLines className="w-4 h-4" /><h3 className="font-semibold">Text to Speech</h3></div>
            <div className="space-y-3">
                <div className="space-y-2">
                    <Label className="text-xs">Voice</Label>
                    <Popover open={voiceDropdownOpen} onOpenChange={setVoiceDropdownOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-full justify-between"><span className="truncate">{selectedVoice}</span><ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search voice..." />
                                <CommandList>
                                    <CommandEmpty>No voice found.</CommandEmpty>
                                    <CommandGroup>
                                        {voices.map((voice) => (
                                            <CommandItem key={voice} value={voice} onSelect={(val) => { setSelectedVoice(val); setVoiceDropdownOpen(false); }}>{voice}</CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">The voice that will be used to speak the utterance.</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between"><Label className="text-xs">Pitch</Label><span className="text-sm font-medium text-muted-foreground">{pitch.toFixed(1)}</span></div>
                    <Slider min={0} max={2} step={0.1} value={[pitch]} onValueChange={(val) => setPitch(val[0])} />
                    <p className="text-xs text-muted-foreground">The pitch at which the utterance will be spoken at.</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between"><Label className="text-xs">Rate</Label><span className="text-sm font-medium text-muted-foreground">{rate.toFixed(1)}</span></div>
                    <Slider min={0.5} max={2} step={0.1} value={[rate]} onValueChange={(val) => setRate(val[0])} />
                    <p className="text-xs text-muted-foreground">The speed at which the utterance will be spoken at.</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between"><Label className="text-xs">Volume</Label><span className="text-sm font-medium text-muted-foreground">{volume.toFixed(2)}</span></div>
                    <Slider min={0} max={1} step={0.05} value={[volume]} onValueChange={(val) => setVolume(val[0])} />
                    <p className="text-xs text-muted-foreground">The volume that the utterance will be spoken at.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent"><Volume2 className="w-4 h-4" />Check</Button>
            </div>
        </div>
    )
}
