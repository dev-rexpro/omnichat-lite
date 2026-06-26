
"use client"

import type React from "react"
import { useTheme } from "next-themes"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface UIPanelProps {
    selectedLanguage: string;
    setSelectedLanguage: (lang: string) => void;
    languageDropdownOpen: boolean;
    setLanguageDropdownOpen: (isOpen: boolean) => void;
    displayUserMessagesRaw: boolean;
    setDisplayUserMessagesRaw: (isRaw: boolean) => void;
    displayModelMessagesRaw: boolean;
    setDisplayModelMessagesRaw: (isRaw: boolean) => void;
}

export function UIPanel({
    selectedLanguage, setSelectedLanguage, languageDropdownOpen, setLanguageDropdownOpen,
    displayUserMessagesRaw, setDisplayUserMessagesRaw, displayModelMessagesRaw, setDisplayModelMessagesRaw,
}: UIPanelProps) {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /><h3 className="font-semibold">User Interface</h3></div>
            <div className="space-y-3">
                <div className="space-y-2">
                    <Label className="text-xs">Language</Label>
                    <Popover open={languageDropdownOpen} onOpenChange={setLanguageDropdownOpen}><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 w-full justify-between"><span>{selectedLanguage}</span><ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><Command><CommandInput placeholder="Search language..." /><CommandList><CommandEmpty>No language found.</CommandEmpty><CommandGroup>{["English", "Indonesian"].map((lang) => (<CommandItem key={lang} value={lang} onSelect={(val) => { setSelectedLanguage(val); setLanguageDropdownOpen(false); }}>{lang}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                    <p className="text-xs text-muted-foreground">User interface display language.</p>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Theme</Label>
                    <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 w-full justify-between"><span>{theme === "system" ? "System" : (theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System")}</span><ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><Command><CommandList><CommandGroup>{["Light", "Dark", "System"].map((item) => (<CommandItem key={item} value={item} onSelect={(val) => setTheme(val.toLowerCase())}>{item}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                    <p className="text-xs text-muted-foreground">Choose the color theme of the application.</p>
                </div>
                <div className="flex items-center justify-between pt-1"><div><Label className="font-medium">Display user messages raw</Label><p className="text-xs text-muted-foreground">Markdown processing will be disabled for user messages.</p></div><Switch checked={displayUserMessagesRaw} onCheckedChange={setDisplayUserMessagesRaw} /></div>
                <div className="flex items-center justify-between"><div><Label className="font-medium">Display model messages raw</Label><p className="text-xs text-muted-foreground">Markdown processing will be disabled for model messages.</p></div><Switch checked={displayModelMessagesRaw} onCheckedChange={setDisplayModelMessagesRaw} /></div>
            </div>
            <div className="pt-4 text-xs text-muted-foreground space-y-1">
                <p>Application Version: 2.38.2</p>
                <p>Settings are saved in browser&apos;s localStorage.</p>
            </div>
        </div>
    )
}
