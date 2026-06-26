
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChatProvider, useChat } from "@/hooks/use-chat"
import { useSettings } from "@/hooks/use-settings"
import { useAuth } from "@/hooks/use-auth"
import type { Settings } from "@/types/settings"

// Import UI components
import { LeftSidebar } from "@/components/left-sidebar"
import { ChatHeader } from "@/components/chat-header"
import { SearchPanel } from "@/components/search-panel"
import { RightSidebar } from "@/components/right-sidebar"
import { PythonInterpreterPanel } from "@/components/python-interpreter-panel"
import { CodeRunnerProvider, useCodeRunner } from "@/contexts/code-runner-context"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <CodeRunnerProvider>
      <MainLayoutContent children={children} router={router} />
    </CodeRunnerProvider>
  )
}

function MainLayoutContent({ children, router }: { children: React.ReactNode, router: any }) {

  // App layout state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
  const [headerTitle, setHeaderTitle] = useState("New Chat")

  const { isAuthenticated, isLoading } = useAuth()
  const { settings, updateSettings } = useSettings()
  const { currentChatId, chats } = useChat()
  const { isPanelOpen } = useCodeRunner()

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsLeftSidebarOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Sync header title with current chat
  useEffect(() => {
    if (currentChatId && chats) {
      const currentChat = chats.find(c => c.id === currentChatId)
      if (currentChat) {
        setHeaderTitle(currentChat.title)
      }
    } else {
      setHeaderTitle("New Chat")
    }
  }, [currentChatId, chats])

  const toggleSidebar = (side: "left" | "right") => {
    if (side === "left") {
      setIsLeftSidebarOpen(!isLeftSidebarOpen)
    } else if (side === "right") {
      setIsRightSidebarOpen(!isRightSidebarOpen)
    }
  }

  const toggleSearchPanel = () => {
    setIsSearchPanelOpen(!isSearchPanelOpen)
  }


  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {(isLeftSidebarOpen || isRightSidebarOpen) && (
        <div
          onClick={() => {
            setIsLeftSidebarOpen(false)
            setIsRightSidebarOpen(false)
          }}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
        />
      )}

      <div className="w-full h-screen flex bg-background text-foreground overflow-hidden antialiased">
        <LeftSidebar
          isLeftOpen={isLeftSidebarOpen}
          setHeaderTitle={setHeaderTitle}
          toggleSearchPanel={toggleSearchPanel}
          toggleSidebar={() => toggleSidebar("left")}
        />

        <div className="flex-1 flex flex-col h-screen min-w-0 bg-background transition-all duration-300">
          <ChatHeader
            isLeftOpen={isLeftSidebarOpen}
            isRightOpen={isRightSidebarOpen}
            headerTitle={headerTitle}
            toggleSidebar={toggleSidebar}
          />

          <div className="flex-1 pr-0 md:pr-3 pb-3 pt-0.5 overflow-hidden flex transition-all duration-300 ease-in-out">
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background transition-all duration-300">
              {isSearchPanelOpen ? (
                <SearchPanel toggleSearchPanel={toggleSearchPanel} />
              ) : (
                children
              )}
            </div>

            <aside
              className={cn(
                "bg-background flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap transform-gpu",
                "fixed top-0 right-0 h-full z-50 w-full border-l border-border",
                "md:relative md:w-[320px] md:border md:rounded-xl md:ml-3",
                (isRightSidebarOpen || isPanelOpen)
                  ? "translate-x-0 md:scale-x-100 md:opacity-100"
                  : "translate-x-full md:scale-x-0 md:opacity-0 md:w-0 md:ml-0"
              )}
              style={{ transformOrigin: "right" }}
            >
              {isPanelOpen ? (
                <PythonInterpreterPanel />
              ) : (
                <RightSidebar
                  toggleSidebar={() => toggleSidebar("right")}
                />
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
