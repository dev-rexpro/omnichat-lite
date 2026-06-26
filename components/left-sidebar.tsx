"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { useSettings } from "@/hooks/use-settings"
import {
  Plus,
  Search,
  EllipsisVertical,
  Pencil,
  Trash2,
  Settings,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { RenameChatDialog } from "@/components/rename-chat-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LeftSidebarProps {
  isLeftOpen: boolean
  setHeaderTitle: (title: string) => void
  toggleSearchPanel: () => void;
  toggleSidebar: () => void;
}

export function LeftSidebar({
  isLeftOpen,
  setHeaderTitle,
  toggleSearchPanel,
  toggleSidebar,
}: LeftSidebarProps) {
  const router = useRouter()
  const { chats, currentChatId, setCurrentChatId, deleteChat, renameChat } = useChat()
  const { user, logout } = useAuth()
  const { settings, updateSettings, resetSession } = useSettings()
  const [openRecentMenu, setOpenRecentMenu] = useState<string | null>(null)
  const [chatIdToRename, setChatIdToRename] = useState<string | null>(null)
  const [chatIdToDelete, setChatIdToDelete] = useState<string | null>(null)

  const handleNewChat = () => {
    setCurrentChatId(null)
    setHeaderTitle("New Chat")

    // Reset all tools and model when starting a new chat
    resetSession()

    if (window.innerWidth < 768) {
      // logic to close sidebar could be passed via props if needed
    }
  }

  const handleChatSelect = (chatId: string, title: string) => {
    setCurrentChatId(chatId);
    setHeaderTitle(title);
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatIdToDelete(id);
    setOpenRecentMenu(null);
  }

  const handleRenameClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatIdToRename(id);
    setOpenRecentMenu(null);
  }

  const onRename = async (newTitle: string) => {
    if (chatIdToRename) {
      await renameChat(chatIdToRename, newTitle);
      setChatIdToRename(null);
    }
  }

  const onDeleteConfirm = async () => {
    if (chatIdToDelete) {
      await deleteChat(chatIdToDelete);
      setChatIdToDelete(null);
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const chatToRename = chats?.find(c => c.id === chatIdToRename)

  return (
    <>
      <aside
        className={cn(
          "bg-background flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap transform-gpu",
          // Mobile behavior: fixed, overlay, 70% width, with a right border
          "fixed top-0 left-0 h-full z-50 border-r border-border w-[70%]",
          isLeftOpen ? "translate-x-0" : "-translate-x-full",

          // Desktop behavior: relative, specific widths, stays in flow, NO right border
          "md:relative md:h-auto md:z-30 md:translate-x-0 md:border-r-0",
          isLeftOpen ? "md:w-[240px]" : "md:w-[64px]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-14 flex items-center px-4 pl-4 flex-shrink-0 overflow-hidden">
            <div
              onClick={toggleSidebar}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
                  <div className="w-8 h-8 flex-shrink-0 bg-primary text-primary-foreground rounded-md flex items-center justify-center shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="12" height="20" x="6" y="2" rx="2" />
                      <rect width="20" height="12" x="2" y="6" rx="2" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center shadow-sm">
                    {isLeftOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "font-semibold text-[20px] tracking-tight transition-all duration-200 overflow-hidden",
                  isLeftOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}
              >
                Omnichat
              </span>
          </div>
        </div>

        {/* New Chat Button */}
          <div className="px-3 mt-2 flex-shrink-0">
            <Tooltip open={isLeftOpen ? false : undefined}>
              <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                 <Button
                  onClick={handleNewChat}
                  variant="ghost"
                  className="w-full h-9 justify-start px-2 overflow-hidden bg-accent text-accent-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                  <span
                    className={cn(
                      "flex-1 text-left transition-all duration-200 overflow-hidden whitespace-nowrap font-semibold",
                      isLeftOpen ? "ml-2 opacity-100 w-auto" : "ml-0 opacity-0 w-0"
                    )}
                  >
                    New Chat
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          </div>

          {/* Recents List */}
          <div className="flex-1 flex flex-col overflow-hidden mt-6">
            <div
              className={cn(
                "flex-1 flex flex-col min-h-0 transition-opacity duration-200",
                isLeftOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="px-3 mb-2 flex items-center justify-between group flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Recents</span>
                <Search
                  className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={toggleSearchPanel}
                />
              </div>
              <div className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 transition-colors">
                {chats?.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group relative h-9 flex items-center px-2 rounded-md text-sm transition-all pr-1 cursor-pointer",
                      currentChatId === chat.id
                        ? "bg-accent/80 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => handleChatSelect(chat.id, chat.title)}
                  >
                    <div className="flex-1 truncate py-2 text-[13px]">
                      {chat.title}
                    </div>
                    <div className="relative ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenRecentMenu(openRecentMenu === chat.id ? null : chat.id)
                            }}
                            className="h-6 w-6 hover:bg-background/80 text-muted-foreground hover:text-foreground"
                          >
                            <EllipsisVertical className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Menu</TooltipContent>
                      </Tooltip>
                      {openRecentMenu === chat.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 z-50 overflow-hidden rounded-md border border-input bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-100">
                          <div className="p-1">
                            <div
                              className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={(e) => handleRenameClick(e, chat.id)}
                            >
                              <Pencil className="w-3 h-3" /> Rename
                            </div>
                            <div
                              className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors"
                              onClick={(e) => handleDeleteClick(e, chat.id)}
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(!chats || chats.length === 0) && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground/50 italic">
                    No recent chats
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer (Settings & Profile) */}
          <div className="p-3 space-y-1 flex-shrink-0">
            <Tooltip open={isLeftOpen ? false : undefined}>
              <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="ghost"
                  className="w-full h-9 text-muted-foreground hover:bg-accent hover:text-foreground justify-start px-2 overflow-hidden"
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-200 overflow-hidden whitespace-nowrap font-normal",
                      isLeftOpen ? "ml-2 opacity-100 w-auto" : "ml-0 opacity-0 w-0"
                    )}
                  >
                    Settings
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>

            <div
              className={cn(
                "py-2 mt-1 h-9 flex items-center justify-between group overflow-hidden transition-all",
                isLeftOpen ? "px-2" : "pl-[6px] pr-2"
              )}
            >
              <span
                className={cn(
                  "text-xs text-muted-foreground truncate transition-all duration-200 overflow-hidden whitespace-nowrap",
                  isLeftOpen ? "opacity-100 w-auto mr-2" : "opacity-0 w-0 mr-0"
                )}
              >
                Signed in as <span className="font-semibold text-foreground">{user?.username}</span>
              </span>
              <Tooltip>
                <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0 h-auto w-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      <RenameChatDialog
        open={!!chatIdToRename}
        onOpenChange={(open) => !open && setChatIdToRename(null)}
        currentTitle={chatToRename?.title || ""}
        onRename={onRename}
      />

      <AlertDialog open={!!chatIdToDelete} onOpenChange={(open) => !open && setChatIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
