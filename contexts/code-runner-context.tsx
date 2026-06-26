
"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface CodeRunnerContextType {
    code: string
    language: string
    commandTimestamp: number
    isPanelOpen: boolean
    runCode: (code: string, language?: string) => void
    togglePanel: () => void
    closePanel: () => void
}

const CodeRunnerContext = createContext<CodeRunnerContextType | undefined>(undefined)

export function CodeRunnerProvider({ children }: { children: ReactNode }) {
    const [code, setCode] = useState("")
    const [language, setLanguage] = useState("python")
    const [commandTimestamp, setCommandTimestamp] = useState(0)
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const runCode = (newCode: string, lang: string = "python") => {
        setCode(newCode)
        setLanguage(lang)
        setCommandTimestamp(Date.now())
        setIsPanelOpen(true)
    }

    const togglePanel = () => setIsPanelOpen(prev => !prev)
    const closePanel = () => setIsPanelOpen(false)

    return (
        <CodeRunnerContext.Provider value={{ code, language, commandTimestamp, isPanelOpen, runCode, togglePanel, closePanel }}>
            {children}
        </CodeRunnerContext.Provider>
    )
}

export function useCodeRunner() {
    const context = useContext(CodeRunnerContext)
    if (context === undefined) {
        throw new Error("useCodeRunner must be used within a CodeRunnerProvider")
    }
    return context
}
