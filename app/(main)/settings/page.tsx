"use client"

import { useTheme } from "next-themes"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/db"
import {
  Settings, Monitor, Mic, MessageSquare, FlaskConical, Database, SlidersHorizontal, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import providersConfig from "@/config/inference-providers.json"
import { useSettings } from "@/hooks/use-settings"
import { useChat } from "@/hooks/use-chat"

// Import all the panel components
import { GeneralPanel } from "@/components/settings/general-panel"
import { UIPanel } from "@/components/settings/ui-panel"
import { VoicePanel } from "@/components/settings/voice-panel"
import { ConversationsPanel } from "@/components/settings/conversations-panel"
import { DataPanel } from "@/components/settings/data-panel"
import { AdvancedPanel } from "@/components/settings/advanced-panel"
import { ExperimentalPanel } from "@/components/settings/experimental-panel"

type ProviderId = keyof typeof providersConfig;
type ProviderSettings = { apiKey?: string; baseUrl?: string;[key: string]: any; };

export default function SettingsPage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { settings, updateSettings } = useSettings()
  const { clearAllData, exportData, importData } = useChat()
  const [settingsTab, setSettingsTab] = useState("general")

  // Ensure initial provider is valid
  const initialProvider = (settings && settings.provider && providersConfig[settings.provider as ProviderId]
    ? settings.provider
    : Object.keys(providersConfig)[0]) as ProviderId

  // All states are managed here in the main component
  const [provider, setProvider] = useState<ProviderId>(initialProvider)
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false)

  const [providerSettings, setProviderSettings] = useState<Record<ProviderId, ProviderSettings>>(() => {
    const initial = {} as Record<ProviderId, ProviderSettings>;
    try {
      if (!providersConfig) throw new Error("providersConfig is missing");
      const keys = settings?.apiKeys || {};
      for (const key in providersConfig) {
        const id = key as ProviderId;
        initial[id] = {
          apiKey: keys[id] || "",
          baseUrl: providersConfig[id]?.baseUrl || ""
        };
      }
    } catch (err) {
      console.error("Error initializing provider settings:", err);
    }
    return initial;
  });

  const [model, setModel] = useState(settings.model);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Record<string, Array<{ id: string; name: string }>>>(settings.fetchedModels || {});
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction || "");
  const [userName, setUserName] = useState("You");
  const [language, setLanguage] = useState("English");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [displayUserRaw, setDisplayUserRaw] = useState(settings.displayUserMessagesRaw);
  const [displayModelRaw, setDisplayModelRaw] = useState(settings.displayModelMessagesRaw);
  const [voice, setVoice] = useState("Microsoft David - English (United States)");
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pasteLimit, setPasteLimit] = useState(10000);
  const [pdfAsImage, setPdfAsImage] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [expandThinking, setExpandThinking] = useState(settings.expandThinking);
  const [excludeThinking, setExcludeThinking] = useState(settings.excludeThinkingOnSubmit);
  const [enablePythonInterpreter, setEnablePythonInterpreter] = useState(settings.enablePythonInterpreter);
  const [adv, setAdv] = useState({
    overrideGeneration: false, temperature: 0.8, top_k: 40, top_p: 0.95, min_p: 0.05, max_tokens: -1,
    replaceSamplers: false, samplers: "ndkypmxl", dynatemp_range: 0, dynatemp_exponent: 1, typical_p: 1, xfc_probability: 0, xfc_threshold: 0.1,
    replacePenalties: false, repeat_last_n: 64, repeat_penalty: 1, presence_penalty: 0, frequency_penalty: 0, dry_multiplier: 0, dry_base: 1.75, dry_allowed_length: 2, dry_penalty_last_n: -1,
    customJson: ""
  });

  // Fetch models handler
  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const currentBaseUrl = providerSettings[provider]?.baseUrl || providersConfig[provider]?.baseUrl || '';
      const currentApiKey = providerSettings[provider]?.apiKey || '';
      const params = new URLSearchParams({
        baseUrl: currentBaseUrl,
        ...(currentApiKey ? { apiKey: currentApiKey } : {})
      });
      const res = await fetch(`/api/models?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch models');
      }
      const models = data.models || [];
      const updated = { ...fetchedModels, [provider]: models };
      setFetchedModels(updated);
      // Persist fetched models to global settings
      updateSettings({ fetchedModels: updated });
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch models');
    } finally {
      setIsFetchingModels(false);
    }
  };

  // All handlers are managed here
  const handleClose = () => {
    // Sync back to global settings before closing
    updateSettings({
      provider,
      model,
      displayModelMessagesRaw: displayModelRaw,
      systemInstruction: systemInstruction,
      expandThinking: expandThinking,
      excludeThinkingOnSubmit: excludeThinking,
      enablePythonInterpreter: enablePythonInterpreter,
      fetchedModels: fetchedModels,
      providerBaseUrls: Object.keys(providerSettings).reduce((acc, key) => {
        acc[key] = providerSettings[key as ProviderId].baseUrl || '';
        return acc;
      }, {} as Record<string, string>),
      apiKeys: Object.keys(providerSettings).reduce((acc, key) => {
        acc[key] = providerSettings[key as ProviderId].apiKey || "";
        return acc;
      }, {} as Record<string, string>)
    })
    router.push("/");
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear data:", e);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnichat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export data:", e);
    }
  };

  const handleImport = async (content: string) => {
    try {
      await importData(content);
      alert("Data imported successfully!");
    } catch (e) {
      console.error("Failed to import data:", e);
      alert("Failed to import data. Please check the file format.");
    }
  };
  const handleProviderChange = (field: 'apiKey' | 'baseUrl', value: string) => {
    if (!provider) return;
    setProviderSettings(p => ({ ...p, [provider]: { ...p[provider] || {}, [field]: value } }));
    if (field === 'apiKey' && settings) {
      updateSettings({ apiKeys: { ...(settings.apiKeys || {}), [provider]: value } });
    }
  };

  // Update provider and model in global settings immediately when changed
  const handleProviderSelect = (p: ProviderId) => {
    setProvider(p);
    setModel('');
    updateSettings({ provider: p, model: '' });
  };

  const handleModelSelect = (m: string) => {
    setModel(m);
    updateSettings({ model: m });
  };

  const handleAdvChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numValue = e.target.type === 'number' ? parseFloat(value) : value;
    setAdv(p => ({ ...p, [name]: numValue }));
  };
  const handleAdvSwitch = (name: string, checked: boolean) => setAdv(p => ({ ...p, [name]: checked }));

  const voices = ["Microsoft David - English (United States)", "Microsoft Mark - English (United States)", "Microsoft Zira - English (United States)"];

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "ui", label: "UI", icon: Monitor },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "data", label: "Data", icon: Database },
    { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
    { id: "experimental", label: "Experimental", icon: FlaskConical },
  ];

  const currentTab = tabs.find(t => t.id === settingsTab);

  const renderPanel = () => {
    switch (settingsTab) {
      case "general":
        return <GeneralPanel
          selectedProvider={provider} setSelectedProvider={handleProviderSelect}
          providerDropdownOpen={providerDropdownOpen} setProviderDropdownOpen={setProviderDropdownOpen}
          providerSettings={providerSettings} handleProviderSettingChange={handleProviderChange}
          selectedModel={model} setSelectedModel={handleModelSelect}
          modelDropdownOpen={modelDropdownOpen} setModelDropdownOpen={setModelDropdownOpen}
          fetchedModels={fetchedModels}
          isFetchingModels={isFetchingModels}
          fetchError={fetchError}
          onFetchModels={handleFetchModels} />
      case "ui":
        return <UIPanel
          selectedLanguage={language} setSelectedLanguage={setLanguage}
          languageDropdownOpen={languageDropdownOpen} setLanguageDropdownOpen={setLanguageDropdownOpen}
          displayUserMessagesRaw={displayUserRaw} setDisplayUserMessagesRaw={setDisplayUserRaw}
          displayModelMessagesRaw={displayModelRaw} setDisplayModelMessagesRaw={setDisplayModelRaw} />
      case "voice":
        return <VoicePanel
          selectedVoice={voice} setSelectedVoice={setVoice}
          voiceDropdownOpen={voiceDropdownOpen} setVoiceDropdownOpen={setVoiceDropdownOpen}
          voices={voices} pitch={pitch} setPitch={setPitch} rate={rate} setRate={setRate} volume={volume} setVolume={setVolume} />
      case "conversations":
        return <ConversationsPanel
          pasteLimitation={pasteLimit} setPasteLimitation={setPasteLimit}
          usePdfAsImage={pdfAsImage} setUsePdfAsImage={setPdfAsImage}
          showPerformanceMetrics={showMetrics} setShowPerformanceMetrics={setShowMetrics}
          expandThinking={expandThinking} setExpandThinking={setExpandThinking}
          excludeThinkingOnSubmit={excludeThinking} setExcludeThinkingOnSubmit={setExcludeThinking} />
      case "data":
        return <DataPanel onClearData={handleClearData} onExport={handleExport} onImport={handleImport} />
      case "advanced":
        return <AdvancedPanel />
      case "experimental":
        return <ExperimentalPanel enablePythonInterpreter={enablePythonInterpreter} setEnablePythonInterpreter={setEnablePythonInterpreter} />
      default:
        return null;
    }
  }

  return (
    <div className="flex-1 bg-background border border-border rounded-xl shadow-sm overflow-hidden flex h-full">
      <div className="hidden md:flex w-52 border-r border-border bg-background flex-shrink-0 flex-col p-2 space-y-1">
        {tabs.map(tab => (
          <Button key={tab.id} variant={settingsTab === tab.id ? "secondary" : "ghost"} size="sm" onClick={() => setSettingsTab(tab.id)} className="w-full justify-start gap-2"><tab.icon className="w-4 h-4" />{tab.label}</Button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-xl">
          <div className="md:hidden mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-full justify-between">
                  <span className="flex items-center gap-2">{currentTab && <currentTab.icon className="w-4 h-4" />}{currentTab?.label}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                {tabs.map(tab => (
                  <DropdownMenuItem key={tab.id} onClick={() => setSettingsTab(tab.id)} className={cn(settingsTab === tab.id && "bg-accent")}>
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {renderPanel()}
        </div></div>
        <div className="p-3 border-t border-border bg-background flex items-center gap-2">
          <Button size="sm" onClick={handleClose}>Save</Button>
          <Button size="sm" variant="outline" onClick={handleClose}>Close</Button>
          <Button size="sm" variant="outline" className="ml-auto bg-transparent">Reset</Button>
        </div>
      </div>
    </div>
  )
}
