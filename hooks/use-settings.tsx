
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import type { Settings } from "@/types/settings"
import { useAuth } from "@/hooks/use-auth"

interface SettingsContextType {
    settings: Settings
    setSettings: React.Dispatch<React.SetStateAction<Settings>>
    updateSettings: (newSettings: Partial<Settings>) => void
    resetSettings: () => void
    resetSession: () => void
}

const defaultSettings: Settings = {
    model: "gemini-2.5-flash",
    provider: "google",
    systemInstruction: "",
    temperature: 1,
    mediaResolution: "default",
    syntaxTheme: "auto",
    thinking: false,
    thinkingLevel: "low",
    thinkingBudget: 8192,
    tools: {
        structuredOutput: false,

        functionCalling: false,
        googleSearch: false,
        urlContext: false,

        canvas: false,
        deepResearch: false,
        images: false,
        videos: false,
    },
    functionDeclarations: "[]",
    expandThinking: false,
    excludeThinkingOnSubmit: true,
    enablePythonInterpreter: false,
    displayUserMessagesRaw: false,
    displayModelMessagesRaw: false,
    apiKeys: {},
    providerBaseUrls: {},
    fetchedModels: {},
    advanced: {
        stopSequences: [],
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 0,
    },
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const VALID_GEMINI_IDS = [
    "gemini-3.5-flash",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it"
]

// ... imports removed from here


export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth()
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount or when user changes
    useEffect(() => {
        if (!user) return; // Wait for user to be loaded

        const userKey = `omnichat_settings_${user.id}`
        const saved = localStorage.getItem(userKey)

        // Try to load user specific settings first
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                // Normalize model if invalid
                if (parsed.provider === 'google' && parsed.model && !VALID_GEMINI_IDS.includes(parsed.model)) {
                    parsed.model = "gemini-2.5-flash";
                }
                setSettings({ ...defaultSettings, ...parsed })
            } catch (e) {
                console.error("Failed to parse settings:", e)
            }
        } else {
            // Fallback: Check for legacy global settings to migrate
            const legacy = localStorage.getItem("omnichat_settings")
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy)
                    if (parsed.provider === 'google' && parsed.model && !VALID_GEMINI_IDS.includes(parsed.model)) {
                        parsed.model = "gemini-2.5-flash";
                    }
                    setSettings({ ...defaultSettings, ...parsed })
                    // We don't delete legacy here, ensuring safety. 
                    // It will be saved to new key in the next effect.
                } catch (e) {
                    console.error("Failed to parse legacy settings:", e)
                }
            }
        }
        setIsLoaded(true)
    }, [user])

    // Model-specific effects for Gemini
    useEffect(() => {
        if (!isLoaded || settings.provider !== "google") return;

        const model = settings.model;
        let updates: Partial<Settings> = {};

        if (model.includes("gemini-3-pro-image-preview")) {
            updates = {
                thinking: true,
                thinkingLevel: "low", // Image model might differ, but assuming some thinking
                tools: { ...settings.tools, images: true, googleSearch: false, structuredOutput: false, functionCalling: false },
                advanced: { ...settings.advanced, maxOutputTokens: 8192 }
            };
        } else if (model.includes("gemini-2.5-flash-image")) {
            updates = {
                thinking: false,
                tools: { ...settings.tools, images: true, googleSearch: false, structuredOutput: false, functionCalling: false },
                advanced: { ...settings.advanced, maxOutputTokens: 8192 }
            };
        } else if (model.includes("gemini-3-pro") || model.includes("gemini-3.1-pro")) {
            updates = {
                thinking: true,
                thinkingLevel: "high",
                tools: { ...settings.tools, googleSearch: true, structuredOutput: false, functionCalling: false },
                advanced: { ...settings.advanced, maxOutputTokens: 65536 }
            };
        } else if (model.includes("gemini-3-flash") || model.includes("gemini-3.5-flash") || model.includes("gemini-3.1-flash")) {
            updates = {
                thinking: true,
                thinkingLevel: "low",
                tools: { ...settings.tools, googleSearch: true, structuredOutput: false, functionCalling: false },
                advanced: { ...settings.advanced, maxOutputTokens: 65536 }
            };
        } else if (model.includes("gemini-2.5-pro")) {
            updates = {
                thinking: true,
                thinkingBudget: 8192,
                tools: { ...settings.tools, googleSearch: true, structuredOutput: false, functionCalling: false },
                advanced: { ...settings.advanced, maxOutputTokens: 65536 }
            };
        } else if (model === "gemini-2.5-flash" || model === "gemini-2.5-flash-lite") {
            updates = {
                thinking: false,
                thinkingBudget: 8192,
                tools: { ...settings.tools, googleSearch: false },
                advanced: { ...settings.advanced, maxOutputTokens: 65536 }
            };
        } else if (model.includes("gemma")) {
            updates = {
                thinking: false,
                tools: { ...settings.tools, googleSearch: false, images: false, videos: false },
                advanced: { ...settings.advanced, maxOutputTokens: 8192 }
            };
        }

        // Only update if there are actual changes to avoid infinite loop
        const hasChanges = Object.keys(updates).some(key => {
            if (key === 'tools' || key === 'advanced') {
                return JSON.stringify(updates[key as keyof Settings]) !== JSON.stringify(settings[key as keyof Settings]);
            }
            return (updates as any)[key] !== (settings as any)[key];
        });

        if (hasChanges) {
            updateSettings(updates);
        }
    }, [settings.model, isLoaded]);

    // Save to localStorage whenever settings change
    useEffect(() => {
        if (isLoaded && user) {
            const userKey = `omnichat_settings_${user.id}`
            localStorage.setItem(userKey, JSON.stringify(settings))
        }
    }, [settings, isLoaded, user])

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }))
    }

    const resetSettings = () => {
        setSettings(defaultSettings)
    }

    const resetSession = () => {
        setSettings((prev) => ({
            ...prev,
            tools: defaultSettings.tools,
            thinking: defaultSettings.thinking,
            thinkingLevel: defaultSettings.thinkingLevel,
            thinkingBudget: defaultSettings.thinkingBudget,
            expandThinking: defaultSettings.expandThinking,
        }))
    }

    return (
        <SettingsContext.Provider value={{ settings, setSettings, updateSettings, resetSettings, resetSession }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider")
    }
    return {
        ...context,
        settings: {
            ...context.settings,
            apiKeys: context.settings.apiKeys || {}
        }
    }
}
