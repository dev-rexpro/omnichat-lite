
"use client"

import {
  GitBranch,
  Trash,
  Volume2,
  Copy,
  Pencil
} from "lucide-react"

import { Button } from "@/components/ui/button"

export function UserMessageActions() {
  const handleCopy = () => {
    // Logic to copy content goes here
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7"
        title="Branch"
      >
        <GitBranch className="w-4 h-4 text-muted-foreground" />
      </Button>
       <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7"
        title="Delete"
      >
        <Trash className="w-4 h-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7"
        title="Speak"
      >
        <Volume2 className="w-4 h-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7"
        onClick={handleCopy}
        title="Copy"
      >
        <Copy className="w-4 h-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7"
        title="Edit"
      >
        <Pencil className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
