
"use client"

import type React from "react"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSettings } from "@/hooks/use-settings"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import { RenameChatDialog } from "@/components/rename-chat-dialog"

const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
]

const GEMMA_MODELS = [
  { id: "gemma-4-26b-a4b-it", name: "Gemma 4 26b A4B IT" },
  { id: "gemma-4-31b-it", name: "Gemma 4 31b IT" },
]

const GEMINI_IMAGE_MODELS = [
  { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
  { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
]

interface ChatHeaderProps {
  isLeftOpen: boolean
  isRightOpen: boolean
  headerTitle: string
  toggleSidebar: (side: "left" | "right") => void
}

const ModelList = ({
  setSelectedModel,
  setOpen,
  isImagesToolActive,
  selectedProvider,
  fetchedModels
}: {
  setSelectedModel: (model: string) => void,
  setOpen: (open: boolean) => void,
  isImagesToolActive: boolean,
  selectedProvider: string,
  fetchedModels: Record<string, Array<{ id: string; name: string }>>
}) => {
  const providerModels = fetchedModels[selectedProvider] || [];

  if (selectedProvider === 'google') {
    if (isImagesToolActive) {
      return (
        <Command>
          <CommandInput placeholder="Search model..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {GEMINI_IMAGE_MODELS.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    setSelectedModel(model.id)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{model.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      );
    }

    return (
      <Command>
        <CommandInput placeholder="Search model..." />
        <CommandList>
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup heading="Gemini">
            {GEMINI_MODELS.map((model) => (
              <CommandItem
                key={model.id}
                value={model.id}
                onSelect={() => {
                  setSelectedModel(model.id)
                  setOpen(false)
                }}
              >
                <span className="truncate">{model.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Gemma">
            {GEMMA_MODELS.map((model) => (
              <CommandItem
                key={model.id}
                value={model.id}
                onSelect={() => {
                  setSelectedModel(model.id)
                  setOpen(false)
                }}
              >
                <span className="truncate">{model.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  return (
    <Command>
      <CommandInput placeholder="Search model..." />
      <CommandList>
        <CommandEmpty>No model found.</CommandEmpty>
        {providerModels.length > 0 ? (
           <CommandGroup heading={`${selectedProvider} Models`}>
             {providerModels.map((model) => (
               <CommandItem
                 key={model.id}
                 value={model.id}
                 onSelect={() => {
                   setSelectedModel(model.id)
                   setOpen(false)
                 }}
               >
                 <span className="truncate">{model.name}</span>
               </CommandItem>
             ))}
           </CommandGroup>
        ) : (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            No models loaded. Fetch models in settings.
          </div>
        )}
      </CommandList>
    </Command>
  )
}

export function ChatHeader({
  isLeftOpen,
  isRightOpen,
  headerTitle,
  toggleSidebar
}: ChatHeaderProps) {
  const { settings, updateSettings } = useSettings()
  const { messages, currentChatId, renameChat } = useChat()
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const getSelectedModelName = () => {
    if (!settings.model) return 'Select a model';
    if (settings.provider === 'google') {
      return [...GEMINI_MODELS, ...GEMMA_MODELS, ...GEMINI_IMAGE_MODELS].find(m => m.id === settings.model)?.name || settings.model;
    }
    const providerModels = settings.fetchedModels[settings.provider] || [];
    const found = providerModels.find(m => m.id === settings.model);
    return found?.name || settings.model;
  };

  const selectedModelName = getSelectedModelName();

  const handleModelSelect = (modelId: string) => {
    updateSettings({ model: modelId });
    setIsModelDropdownOpen(false);
  }

  const handleRename = async (newTitle: string) => {
    if (!currentChatId || !newTitle.trim()) return
    setIsSaving(true)
    try {
      await renameChat(currentChatId, newTitle)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <header className="h-14 flex flex-shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1 text-foreground transition-all duration-300 min-w-0">
          {/* Mobile: sidebar toggle only, Desktop: title + rename */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden md:hidden">
            <div
              onClick={() => toggleSidebar("left")}
              className="relative w-8 h-8 flex-shrink-0 cursor-pointer group"
            >
              <div className="absolute inset-0 bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                {isLeftOpen ? <PanelLeftClose className="w-5 h-5 text-foreground" /> : <PanelLeftOpen className="w-5 h-5 text-foreground" />}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 min-w-0 overflow-hidden group">
            <span className="font-semibold text-base truncate">{headerTitle}</span>
            {messages && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRenameDialogOpen(true)}
                className="h-7 w-7 p-1 hover:bg-muted transition-opacity bg-transparent flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Conditional Rendering: Drawer for Mobile, Popover for Desktop */}
          {isMobile ? (
            <Drawer open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-[200px] px-3 justify-between text-sm shadow-sm"
                >
                  <span className="font-medium truncate">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                {/* Visually hidden title for screen reader accessibility */}
                <DrawerTitle className="sr-only">Select a Model</DrawerTitle>
                <div className="p-4">
                  <ModelList setSelectedModel={handleModelSelect} setOpen={setIsModelDropdownOpen} isImagesToolActive={settings.tools.images} selectedProvider={settings.provider} fetchedModels={settings.fetchedModels} />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isModelDropdownOpen}
                  className="h-9 w-[278px] px-3 justify-between text-sm"
                >
                  <span className="font-medium truncate">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[278px] p-0">
                 <ModelList setSelectedModel={handleModelSelect} setOpen={setIsModelDropdownOpen} isImagesToolActive={settings.tools.images} selectedProvider={settings.provider} fetchedModels={settings.fetchedModels} />
              </PopoverContent>
            </Popover>
          )}

              <div
                onClick={() => toggleSidebar("right")}
                className="relative w-8 h-8 flex-shrink-0 cursor-pointer group"
              >
                <div className="absolute inset-0 bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isRightOpen ? <PanelRightClose className="w-5 h-5 text-muted-foreground" /> : <PanelRightOpen className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>
        </div>
      </header>

      <RenameChatDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        currentTitle={headerTitle}
        onRename={handleRename}
        isSaving={isSaving}
      />
    </>
  )
}
