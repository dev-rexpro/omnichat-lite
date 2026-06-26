
"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  Search as SearchIcon,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { useChat } from "@/hooks/use-chat"
import type { Message } from "@/lib/db"

interface SearchPanelProps {
  toggleSearchPanel: () => void
}

interface SearchResult {
  message: Message
  sessionTitle: string
}

export function SearchPanel({ toggleSearchPanel }: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { addMessage, setCurrentChatId } = useChat()

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        const lowerQuery = query.toLowerCase()

        const messages = await db.messages
          .filter((msg) => msg.content.toLowerCase().includes(lowerQuery))
          .limit(50)
          .reverse()
          .toArray()

        // Get unique chat IDs to fetch titles
        const chatIds = [...new Set(messages.map(m => m.chatId))]
        const chats = await db.chats.where('id').anyOf(chatIds).toArray()
        const chatMap = new Map(chats.map(c => [c.id, c.title]))

        const searchResults: SearchResult[] = messages.map((msg) => ({
          message: msg,
          sessionTitle: chatMap.get(msg.chatId) || "Unknown Chat",
        }))

        setResults(searchResults)
      } catch (error) {
        console.error("Search failed:", error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(performSearch, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const handleResultClick = (result: SearchResult) => {
    setCurrentChatId(result.message.chatId)
    toggleSearchPanel()
  }

  const formatDate = (timestamp: Date) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex-1 bg-background border border-border rounded-lg shadow-sm flex flex-col min-w-0 animate-fade-in overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <SearchIcon className="w-4 h-4 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Search History
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSearchPanel}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all conversations..."
              className="pl-9 h-11 bg-muted/30 focus-visible:ring-offset-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="text-sm">
            {query ? (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>
                    {isSearching ? "Searching..." : "Search Results"}
                  </span>
                  {!isSearching && (
                    <span className="text-xs font-normal lowercase">
                      {results.length} found
                    </span>
                  )}
                </h3>

                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.message.id}
                      onClick={() => handleResultClick(result)}
                      className="group border border-border rounded-xl p-4 hover:bg-accent/50 hover:border-primary/20 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="p-1 rounded bg-secondary">
                            <MessageSquare className="w-3 h-3 text-foreground" />
                          </div>
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {result.sessionTitle}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {formatDate(result.message.createdAt)}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-3.5 h-3.5 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {result.message.role === "user" ? (
                          <span className="text-foreground font-bold mr-1.5 underline decoration-primary/30 underline-offset-4">
                            You:
                          </span>
                        ) : (
                          <span className="text-primary font-bold mr-1.5">
                            AI:
                          </span>
                        )}
                        {result.message.content}
                      </p>
                    </div>
                  ))}
                  {!isSearching && results.length === 0 && (
                    <div className="text-center py-12 border border-dashed rounded-xl">
                      <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <SearchIcon className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No messages found matching "{query}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <div className="bg-muted w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                  <SearchIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium mb-1">
                  Search Your History
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Enter keywords above to quickly find specific messages or
                  topics across all your previous chats.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
