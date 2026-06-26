
"use client"

import type React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import providersConfig from "@/config/inference-providers.json"

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

type ProviderId = keyof typeof providersConfig;
type ProviderSettings = { apiKey?: string; baseUrl?: string;[key: string]: any; };

interface GeneralPanelProps {
    selectedProvider: ProviderId;
    setSelectedProvider: (provider: ProviderId) => void;
    providerDropdownOpen: boolean;
    setProviderDropdownOpen: (isOpen: boolean) => void;
    providerSettings: Record<ProviderId, ProviderSettings>;
    handleProviderSettingChange: (field: 'apiKey' | 'baseUrl', value: string) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    modelDropdownOpen: boolean;
    setModelDropdownOpen: (isOpen: boolean) => void;
    fetchedModels: Record<string, Array<{ id: string; name: string }>>;
    isFetchingModels: boolean;
    fetchError: string | null;
    onFetchModels: () => void;
}

export function GeneralPanel({
    selectedProvider,
    setSelectedProvider,
    providerDropdownOpen,
    setProviderDropdownOpen,
    providerSettings,
    handleProviderSettingChange,
    selectedModel,
    setSelectedModel,
    modelDropdownOpen,
    setModelDropdownOpen,
    fetchedModels,
    isFetchingModels,
    fetchError,
    onFetchModels,
}: GeneralPanelProps) {
    const currentProviderConfig = providersConfig[selectedProvider] || Object.values(providersConfig)[0];
    const providerModels = fetchedModels[selectedProvider] || [];

    // For non-Google providers, find display name from fetched models
    const getModelDisplayName = () => {
        if (selectedProvider === 'google') {
            if (!selectedModel) return 'Select a model';
            return [...GEMINI_MODELS, ...GEMMA_MODELS].find(m => m.id === selectedModel)?.name || selectedModel;
        }
        const found = providerModels.find(m => m.id === selectedModel);
        return found?.name || selectedModel || 'Select a model';
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold">Inference Provider</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3">Provider may charge for usage.</p>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label className="text-xs">Provider</Label>
                        <Popover open={providerDropdownOpen} onOpenChange={setProviderDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" role="combobox" aria-expanded={providerDropdownOpen} className="h-9 w-full justify-between">
                                    <span>{currentProviderConfig?.name || "Select Provider"}</span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                    <CommandInput placeholder="Search provider..." />
                                    <CommandList>
                                        <CommandEmpty>No provider found.</CommandEmpty>
                                        <CommandGroup>
                                            {(Object.keys(providersConfig) as ProviderId[]).map((key) => (
                                                <CommandItem key={key} value={key} onSelect={(currentValue) => { setSelectedProvider(currentValue as ProviderId); setProviderDropdownOpen(false); }}>
                                                    {providersConfig[key].name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    {selectedProvider !== 'google' && (
                        <div className="space-y-2">
                            <Label className="text-xs">Base URL</Label>
                            <Input
                                placeholder={currentProviderConfig?.baseUrl || ""}
                                value={providerSettings[selectedProvider]?.baseUrl || ''}
                                onChange={(e) => handleProviderSettingChange('baseUrl', e.target.value)}
                                readOnly={!currentProviderConfig?.allowCustomBaseUrl}
                                className={cn("h-9 text-sm", !currentProviderConfig?.allowCustomBaseUrl && 'bg-muted/50 cursor-not-allowed')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {currentProviderConfig?.allowCustomBaseUrl ? "Set the Base URL if you are using a standalone server." : "This provider does not allow custom Base URLs."}
                            </p>
                        </div>
                    )}
                    {currentProviderConfig?.isKeyRequired && (
                        <div className="space-y-2">
                            <Label className="text-xs">API Key</Label>
                            <Input
                                type="password"
                                placeholder="Enter your API key"
                                value={providerSettings[selectedProvider]?.apiKey || ''}
                                onChange={(e) => handleProviderSettingChange('apiKey', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label className="text-xs">Model</Label>
                        <Popover open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" role="combobox" aria-expanded={modelDropdownOpen} className="h-9 w-full justify-between">
                                    <span className="truncate">{getModelDisplayName()}</span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                    <CommandInput placeholder="Search model..." />
                                    <CommandList>
                                        <CommandEmpty>No model found. {selectedProvider !== 'google' ? 'Try fetching models first.' : ''}</CommandEmpty>
                                        {selectedProvider === 'google' ? (
                                            <>
                                                <CommandGroup heading="Gemini">
                                                    {GEMINI_MODELS.map((model) => (
                                                        <CommandItem key={model.id} value={model.id} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                            <span className="truncate">{model.name}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                                <CommandGroup heading="Gemma">
                                                    {GEMMA_MODELS.map((model) => (
                                                        <CommandItem key={model.id} value={model.id} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                            <span className="truncate">{model.name}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </>
                                        ) : (
                                            <CommandGroup heading={`${currentProviderConfig?.name || 'Provider'} Models`}>
                                                {providerModels.length > 0 ? (
                                                    providerModels.map((model) => (
                                                        <CommandItem key={model.id} value={model.id} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                            <span className="truncate">{model.id}</span>
                                                        </CommandItem>
                                                    ))
                                                ) : (
                                                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                                        No models loaded. Click &quot;Fetch Models&quot; below.
                                                    </div>
                                                )}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">Set the inference model.</p>
                    </div>
                    {selectedProvider !== 'google' && (
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 bg-transparent w-full"
                                onClick={onFetchModels}
                                disabled={isFetchingModels}
                            >
                                {isFetchingModels ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                {isFetchingModels ? 'Fetching...' : 'Fetch Models'}
                            </Button>
                            {fetchError && (
                                <p className="text-xs text-destructive">{fetchError}</p>
                            )}
                            {!fetchError && providerModels.length > 0 && (
                                <p className="text-xs text-muted-foreground">{providerModels.length} models loaded</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
