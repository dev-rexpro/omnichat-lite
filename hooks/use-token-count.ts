"use client"

import { useState, useEffect, useRef } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"

export function useTokenCount(text: string, model: string, apiKey?: string, provider?: string) {
    const [count, setCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!text.trim()) {
            setCount(0)
            return
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            if (!apiKey || provider !== 'google') {
                setCount(Math.ceil(text.length / 4))
                return
            }

            try {
                setIsLoading(true)
                const genAI = new GoogleGenerativeAI(apiKey)
                const genModel = genAI.getGenerativeModel({ model })
                const result = await genModel.countTokens(text)
                setCount(result.totalTokens)
            } catch (error) {
                console.error("Error counting tokens:", error)
                setCount(Math.ceil(text.length / 4))
            } finally {
                setIsLoading(false)
            }
        }, 500)

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [text, model, apiKey, provider])

    return { count, isLoading }
}
