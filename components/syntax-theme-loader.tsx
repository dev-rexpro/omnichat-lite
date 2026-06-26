"use client"

import { useEffect, useState } from 'react'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from 'next-themes'

/**
 * SyntaxThemeLoader
 * Injects highlight.js styles based on the chosen syntax theme and application mode.
 */
export default function SyntaxThemeLoader() {
    const { settings } = useSettings()

    useEffect(() => {
        document.body.dataset.hljsTheme = settings.syntaxTheme || 'auto'
    }, [settings.syntaxTheme])

    return null
}
