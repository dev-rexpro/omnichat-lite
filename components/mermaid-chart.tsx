"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

declare global {
    interface Window {
        mermaid: {
            initialize: (config: Record<string, unknown>) => void;
            render: (
                id: string,
                text: string,
                svgContainingElement?: Element
            ) => Promise<{
                svg: string;
                diagramType: string;
                bindFunctions?: (element: Element) => void;
            }>;
        };
    }
}

type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral'

interface MermaidDrawerProps {
    className?: string;
    code: string;
}

export default function MermaidChart({
    className,
    code,
}: MermaidDrawerProps) {
    const chartRef = useRef<HTMLDivElement | null>(null)
    const [mermaidLoaded, setMermaidLoaded] = useState(false)
    const { theme, resolvedTheme } = useTheme()

    const currentTheme = useMemo(() => {
        const activeTheme = resolvedTheme || theme || 'light'
        return activeTheme === 'dark' ? 'dark' : 'neutral'
    }, [theme, resolvedTheme])

    const renderId = useMemo(
        () => `mermaid-diagram-${Math.random().toString(36).substring(2, 11)}`,
        []
    )

    useEffect(() => {
        // Check if script already exists
        const existingScript = document.getElementById('mermaid-script')

        const initializeMermaid = () => {
            if (window.mermaid) {
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: currentTheme,
                    securityLevel: 'loose',
                    fontFamily: 'inherit'
                })
                setMermaidLoaded(true)
            }
        }

        if (window.mermaid) {
            initializeMermaid()
            return
        }

        if (existingScript) {
            existingScript.addEventListener('load', initializeMermaid)
            return
        }

        const script = document.createElement('script')
        script.id = 'mermaid-script'
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
        script.async = true
        script.onload = initializeMermaid
        document.body.appendChild(script)

        return () => {
            // We don't remove the script to avoid reloading if multiple diagrams exist
        }
    }, [currentTheme])

    useEffect(() => {
        if (!mermaidLoaded || !chartRef.current || !code) return

        const renderDiagram = async () => {
            try {
                const { svg, diagramType } = await window.mermaid.render(renderId, code)
                if (chartRef.current) {
                    chartRef.current.innerHTML = svg
                    chartRef.current.setAttribute('aria-label', `Mermaid ${diagramType} chart`)
                }
            } catch (error) {
                console.error('Mermaid rendering error:', error)
                if (chartRef.current) {
                    chartRef.current.innerHTML = `<div class="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive text-xs font-mono whitespace-pre-wrap">${code}</div>`
                    chartRef.current.setAttribute('aria-label', 'Mermaid diagram (render failed)')
                }
            }
        }

        renderDiagram()
    }, [code, mermaidLoaded, renderId, currentTheme])

    return (
        <div
            ref={chartRef}
            className={cn("my-6 flex justify-center bg-white dark:bg-zinc-900/50 p-6 rounded-xl border border-border overflow-x-auto no-scrollbar shadow-sm", className)}
            role="img"
            aria-label="Diagram"
        >
            <div className="animate-pulse flex space-x-4 h-20 items-center justify-center w-full">
                <div className="h-2 w-2 bg-muted rounded-full"></div>
                <div className="h-2 w-2 bg-muted rounded-full"></div>
                <div className="h-2 w-2 bg-muted rounded-full"></div>
            </div>
        </div>
    )
}

// Utility to merge classes inside this file since we need cn
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
