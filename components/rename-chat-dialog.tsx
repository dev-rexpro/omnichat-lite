"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface RenameChatDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentTitle: string
    onRename: (newTitle: string) => Promise<void>
    isSaving?: boolean
}

export function RenameChatDialog({
    open,
    onOpenChange,
    currentTitle,
    onRename,
    isSaving = false,
}: RenameChatDialogProps) {
    const [title, setTitle] = useState(currentTitle)

    useEffect(() => {
        if (open) {
            setTitle(currentTitle)
        }
    }, [open, currentTitle])

    const handleSave = async () => {
        if (!title.trim() || isSaving) return
        await onRename(title)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-foreground">Rename Chat</DialogTitle>
                </DialogHeader>
                <div className="px-6 py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-foreground/80">
                            Chat name
                        </Label>
                        <Input
                            id="name"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter chat name..."
                            className="h-10 border-input bg-background focus-visible:ring-1 focus-visible:ring-ring"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave()
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-semibold text-foreground/80">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Optional"
                            className="min-h-[100px] resize-none border-input bg-background focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <DialogFooter className="p-6 pt-2 flex items-center justify-end gap-3 bg-muted/5 border-t border-border/50">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="hover:bg-accent font-medium"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-medium shadow-sm transition-all"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
