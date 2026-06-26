
"use client"

import React, { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  X,
  Edit2,
} from "lucide-react"
import { FunctionCallingDialog } from "@/components/function-calling-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings } from "@/hooks/use-settings"
import { useTokenCount } from "@/hooks/use-token-count"
import type { Settings } from "@/types/settings"
import { cn } from "@/lib/utils"
import sidebarConfig from "@/config/sidebar-config.json"

interface CollapsibleSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="space-y-2">
    <div
      className="flex items-center justify-between cursor-pointer group py-2.5"
      onClick={onToggle}
    >
      <Label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase cursor-pointer group-hover:text-foreground">
        {title}
      </Label>
      {isOpen ? (
        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      )}
    </div>
    {isOpen && <div className="space-y-4 pt-1">{children}</div>}
  </div>
)

interface RightSidebarProps {
  toggleSidebar: () => void
}



export function RightSidebar({
  toggleSidebar,
}: RightSidebarProps) {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [toolsOpen, setToolsOpen] = useState(true)
  const [isFunctionDialogOpen, setIsFunctionDialogOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [resolutionDropdownOpen, setResolutionDropdownOpen] = useState(false)


  const { count: systemTokenCount, isLoading: isCountingTokens } = useTokenCount(
    settings.systemInstruction,
    settings.model,
    settings.apiKeys[settings.provider],
    settings.provider
  )

  const handleToolChange = (
    key: keyof typeof settings.tools,
    value: boolean
  ) => {
    updateSettings({
      tools: {
        ...settings.tools,
        [key]: value,
      },
    })
  }

  // Settings Content Component for better organization
  const SettingsContent = () => (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {(() => {
        const provider = settings.provider as keyof typeof sidebarConfig;
        const config = sidebarConfig[provider] || sidebarConfig.default;

        return (
          <>
            {/* System Instruction */}
            {config.showSystemInstruction && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  System Instruction
                </Label>
                <Textarea
                  className="min-h-[85px] text-sm resize-y border border-input shadow-sm bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="You are a helpful assistant."
                  value={settings.systemInstruction}
                  onChange={(e) =>
                    updateSettings({ systemInstruction: e.target.value })
                  }
                />
              </div>
            )}

            {/* Temperature */}
            {config.showTemperature && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">Temperature</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.temperature]}
                    onValueChange={(val) => updateSettings({ temperature: val[0] })}
                    className="w-full"
                  />
                  <div className="bg-accent px-2 py-0.5 rounded-md text-xs border border-border w-11 text-center font-medium">
                    {settings.temperature.toFixed(1).replace(".", ",")}
                  </div>
                </div>
              </div>
            )}

            {/* Media Resolution */}
            {config.showMediaResolution && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  Media Resolution
                </Label>
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setResolutionDropdownOpen(!resolutionDropdownOpen)}
                    className="h-9 w-full justify-between text-xs shadow-sm bg-transparent"
                  >
                    <span className="capitalize">{settings.mediaResolution}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                  </Button>
                  {resolutionDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-lg">
                      {["default", "high", "low"].map((res) => (
                        <div
                          key={res}
                          onClick={() => {
                            updateSettings({
                              mediaResolution: res as Settings["mediaResolution"],
                            })
                            setResolutionDropdownOpen(false)
                          }}
                          className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-xs hover:bg-accent hover:text-accent-foreground capitalize"
                        >
                          {res}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thinking */}
            {config.showThinking && !settings.model.includes("2.0-flash") && !settings.model.includes("gemma") && (
              <>
                <div className="h-px bg-border/60"></div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-2.5">
                    <Label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                      Thinking
                    </Label>
                    {!settings.model.includes("gemini-3") && !settings.model.includes("gemini-2.5-pro") && (
                      <Switch
                        checked={settings.thinking}
                        onCheckedChange={(val) => updateSettings({ thinking: val })}
                        id="thinking-mode"
                        className="scale-90"
                      />
                    )}
                  </div>
                  {settings.thinking && (
                    <div className="space-y-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {settings.model.includes("gemini-3") ? (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-muted-foreground">Thinking Level</Label>
                          <Select
                            value={settings.thinkingLevel}
                            onValueChange={(val) => updateSettings({ thinkingLevel: val as any })}
                          >
                            <SelectTrigger className="h-9 w-full text-xs bg-transparent">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {settings.model.includes("gemini-3-pro") || settings.model.includes("gemini-3.1-pro") ? (
                                <>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-medium text-muted-foreground">Thinking Budget</Label>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                              {settings.thinkingBudget.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Slider
                              min={0}
                              max={24576}
                              step={256}
                              value={[settings.thinkingBudget]}
                              onValueChange={(val) => updateSettings({ thinkingBudget: val[0] })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tools */}
            {config.showTools && (
              <>
                <div className="h-px bg-border/60"></div>
                <CollapsibleSection
                  title="Tools"
                  isOpen={toolsOpen}
                  onToggle={() => setToolsOpen(!toolsOpen)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">Structured output</span>
                    <Switch
                      checked={settings.tools.structuredOutput}
                      onCheckedChange={(val) => handleToolChange("structuredOutput", val)}
                      disabled={settings.tools.googleSearch}
                      className="scale-90"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">Function calling</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setIsFunctionDialogOpen(true)}
                        disabled={!settings.tools.functionCalling}
                      >
                        Edit
                      </Button>
                      <Switch
                        checked={settings.tools.functionCalling}
                        onCheckedChange={(val) => handleToolChange("functionCalling", val)}
                        disabled={settings.tools.googleSearch}
                        className="scale-90"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">Grounding with Google Search</span>
                    <Switch
                      checked={settings.tools.googleSearch}
                      onCheckedChange={(val) => {
                        updateSettings({
                          tools: {
                            ...settings.tools,
                            googleSearch: val,
                            structuredOutput: val ? false : settings.tools.structuredOutput,
                            functionCalling: val ? false : settings.tools.functionCalling,
                          },
                        });
                      }}
                      className="scale-90"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">URL context</span>
                    <Switch
                      checked={settings.tools.urlContext}
                      onCheckedChange={(val) => handleToolChange("urlContext", val)}
                      className="scale-90"
                    />
                  </div>
                </CollapsibleSection>
              </>
            )}

            {/* Advanced Settings */}
            {config.showAdvancedSettings && (
              <>
                <div className="h-px bg-border/60"></div>
                <CollapsibleSection
                  title="Advanced Settings"
                  isOpen={advancedOpen}
                  onToggle={() => setAdvancedOpen(!advancedOpen)}
                >
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Stop sequence</Label>
                    <Input
                      placeholder="Add stop..."
                      className="h-8 text-xs bg-transparent"
                      value={settings.advanced.stopSequences[0] || ""}
                      onChange={(e) =>
                        updateSettings({
                          advanced: {
                            ...settings.advanced,
                            stopSequences: e.target.value ? [e.target.value] : [],
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Output length</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs bg-transparent"
                      placeholder="2048"
                      value={settings.advanced.maxOutputTokens}
                      onChange={(e) =>
                        updateSettings({
                          advanced: {
                            ...settings.advanced,
                            maxOutputTokens: e.target.value
                              ? parseInt(e.target.value)
                              : 2048,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">Top P</span>
                      <div className="bg-secondary/50 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border w-10 text-center font-bold">
                        {settings.advanced.topP.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={[settings.advanced.topP]}
                        onValueChange={(val) =>
                          updateSettings({
                            advanced: { ...settings.advanced, topP: val[0] },
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[13px] font-medium">Top K ({settings.advanced.topK})</Label>
                    </div>
                    <Input
                      type="number"
                      className="h-8 text-xs bg-transparent"
                      value={settings.advanced.topK}
                      onChange={(e) =>
                        updateSettings({
                          advanced: {
                            ...settings.advanced,
                            topK: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </CollapsibleSection>
              </>
            )}

            {/* Reset Defaults */}
            <div className="pt-4 pb-8">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={resetSettings}
              >
                Reset default settings
              </Button>
            </div>
          </>
        )
      })()}
    </div>
  )

  return (
    <div className="min-w-full md:min-w-[318px] h-full flex flex-col relative bg-background">
      <div className="absolute top-1 right-3 md:hidden z-50">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {settings.enablePythonInterpreter ? (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SettingsContent />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SettingsContent />
        </div>
      )}
      <FunctionCallingDialog
        open={isFunctionDialogOpen}
        onOpenChange={setIsFunctionDialogOpen}
        initialCode={settings.functionDeclarations}
        onSave={(code) => updateSettings({ functionDeclarations: code })}
      />
    </div>
  )
}
