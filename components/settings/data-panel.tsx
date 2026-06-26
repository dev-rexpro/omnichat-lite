
"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { MessageSquare, FileUp, FileDown, Trash2 } from "lucide-react"

interface DataPanelProps {
    onClearData: () => void;
    onExport: () => void;
    onImport: (content: string) => void;
}

export function DataPanel({ onClearData, onExport, onImport }: DataPanelProps) {
    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) onImport(content);
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <h3 className="font-semibold">Chats</h3>
                </div>
                <p className="text-sm text-muted-foreground">Export or import your chat history.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onExport}><FileUp className="w-4 h-4 mr-2" />Export</Button>
                    <Button variant="outline" size="sm" onClick={handleImportClick}><FileDown className="w-4 h-4 mr-2" />Import</Button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <h3 className="font-semibold">Clear All Data</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    This will permanently delete all your chat history and conversation records from this browser. This action cannot be undone.
                </p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Clear All Data</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all your chat data.
                                Please make sure you have exported any data you wish to keep.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onClearData}>Yes, delete everything</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="pt-4 text-xs text-muted-foreground space-y-1">
                <p>Application Version: 2.38.2</p>
                <p>Settings are saved in browser&apos;s localStorage.</p>
            </div>
        </div>
    )
}
