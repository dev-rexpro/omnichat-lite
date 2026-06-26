
"use client"

import { useRef, useEffect, useState } from "react"
import {
  Paperclip,
  Settings2,
  Mic,
  AudioLines,
  ArrowUp,
  Square,
  X,
  FileIcon,
  ImageIcon,
  TerminalSquare,
  Microscope,
  Image as ImageIconLucide,
  Video
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerHeader, DrawerDescription } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { useChat } from "@/hooks/use-chat"
import { useSettings } from "@/hooks/use-settings"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Message } from "@/lib/db"
import { MessageActions } from "@/components/message-actions"
import { UserMessageActions } from "@/components/user-message-actions"
import MarkdownDisplay from "@/components/markdown-display"
import { ChatMessage } from "@/components/chat-message"
import { LiveConversation } from "../live/LiveConversation"
import { useTheme } from "next-themes"




// New Hooks
import { useChatScroll } from "@/hooks/use-chat-scroll"
import { useSpeechToText } from "@/hooks/use-speech-to-text"
import { FileAttachment, FileUploadApi } from "@/hooks/use-file-upload" // Helper type

interface ChatAreaProps {
  userInput: string
  setUserInput: (input: string) => void
  attachments: Array<{ name: string, type: string, data: string }>
  fileUploadApi: FileUploadApi
  isProcessing: boolean
  sendMessage: (attachments?: Array<{ name: string, type: string, data: string }>) => void
  stopGeneration: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, attachments?: Array<{ name: string, type: string, data: string }>) => void
  onRegenerate: () => void
  onEdit: (id: number, content: string) => void
  onSendFunctionResponse: (name: string, content: string) => void
}

export function ChatArea({
  userInput,
  setUserInput,
  attachments,
  fileUploadApi,
  isProcessing,
  sendMessage,
  stopGeneration,
  handleKeyDown,
  onRegenerate,
  onEdit,
  onSendFunctionResponse
}: ChatAreaProps) {
  const { messages, deleteMessage } = useChat();
  const { settings, updateSettings } = useSettings();
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [showLiveConversation, setShowLiveConversation] = useState(false);
  const { theme } = useTheme();

  const toggleTool = (tool: keyof typeof settings.tools) => {
    updateSettings({
      tools: {
        ...settings.tools,
        [tool]: !settings.tools[tool]
      }
    });
  };

  const isCanvasOpen = settings.tools.canvas;
  const isDeepResearchActive = settings.tools.deepResearch;
  const isImagesActive = settings.tools.images;
  const isVideosActive = settings.tools.videos;

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Smart Scroll Hook
  const { scrollImmediate, scrollToBottom, showScrollButton } = useChatScroll(chatScrollRef);

  // Voice Input Hook
  const { isRecording, startRecording, stopRecording, transcript } = useSpeechToText({
    continuous: true,
    interimResults: true,
  });

  const [inputBeforeVoice, setInputBeforeVoice] = useState("");

  // Effect: Sync Voice Transcript to Input
  useEffect(() => {
    // Only update if we are actively recording and have a transcript
    if (isRecording && transcript) {
      const spacer = (inputBeforeVoice && !inputBeforeVoice.endsWith(' ')) ? " " : "";
      setUserInput(inputBeforeVoice + spacer + transcript);
    }
  }, [transcript, isRecording, inputBeforeVoice, setUserInput]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setInputBeforeVoice(userInput);
      startRecording();
    }
  }


  // Effect: Auto-scroll on new messages
  useEffect(() => {
    // scrollImmediate for initial load or big changes
    // scrollToBottom for incremental updates if user is at bottom
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Effect: Scroll on processing start (user sent message)
  useEffect(() => {
    if (isProcessing) {
      scrollImmediate();
    }
  }, [isProcessing, scrollImmediate]);



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Use the advanced handleFiles from the hook which handles PDF conversion etc.
    await fileUploadApi.handleFiles(files);

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (index: number) => {
    fileUploadApi.removeAttachment(index);
  }

  const onSend = () => {
    if (isProcessing) {
      stopGeneration()
    } else if (userInput.trim() || attachments.length > 0) {
      sendMessage(attachments)
      fileUploadApi.clearAttachments();
    }
  }



  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background border border-border rounded-xl relative transition-all duration-300 overflow-hidden">
      <div ref={chatScrollRef} className="flex-1 relative overflow-y-auto flex flex-col scroll-smooth">
        {(!messages || messages.length === 0) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none z-0">
            <div className="max-w-[880px] w-full mx-auto">
              <h1 className="text-3xl font-semibold mb-2 text-foreground">What’s on your mind today?</h1>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[880px] mx-auto px-2 md:px-4 py-6 relative z-10">
            <div className="space-y-8">
              {messages.map((msg: Message, index) => {
                if (msg.role === 'function') return null

                // Merge function responses into the assistant message for display
                let displayMessage = msg
                if (msg.role === 'assistant' && msg.functionCalls) {
                  const responses = []
                  let nextIdx = index + 1
                  while (nextIdx < messages.length && messages[nextIdx].role === 'function') {
                    try {
                      // Try to parse JSON to show structured data
                      const parsed = JSON.parse(messages[nextIdx].content)
                      responses.push(parsed)
                    } catch (e) {
                      responses.push(messages[nextIdx].content)
                    }
                    nextIdx++
                  }

                  if (responses.length > 0) {
                    // Add property to message for display purposes only
                    displayMessage = { ...msg, functionResponses: responses } as any
                  }
                }

                return (
                  <ChatMessage
                    key={msg.id}
                    message={displayMessage}
                    isProcessing={isProcessing && messages[messages.length - 1]?.id === msg.id}
                    onDelete={deleteMessage}
                    onRegenerate={onRegenerate}
                    onEdit={onEdit}
                    onSendFunctionResponse={onSendFunctionResponse}
                  />
                )
              })}
            </div>
            {isProcessing && messages[messages.length - 1]?.role === 'user' && (
              <div className="inline-flex gap-1.5 items-center mt-8 ml-4">
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
              </div>
            )}
          </div>
        )}

        <div className="h-4 flex-shrink-0"></div>
      </div>



      <div
        className="w-full z-20 bg-background border-t border-transparent pt-0 pb-[6px] px-2 mb-[1px] mx-[1px] rounded-b-xl self-center relative"
        style={{ width: "calc(100% - 2px)" }}
      >
        <div className="max-w-[880px] mx-auto px-2 md:px-4 relative">
          {/* Scroll to Bottom Button */}
          <div
            className={cn(
              "absolute -top-12 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 transform",
              showScrollButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md bg-background/80 backdrop-blur-sm border border-border hover:bg-background w-8 h-8"
              onClick={() => scrollImmediate('smooth')}
            >
              <ArrowUp className="w-4 h-4 rotate-180 text-muted-foreground" />
            </Button>
          </div>

          <div className="gradient-focus-container shadow-sm transition-all">
            <div className={cn("gradient-focus-inner relative flex flex-col w-full p-0 border border-input bg-background", isRecording && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]")}>

              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 py-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="group relative w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-1 text-[10px] text-center">
                          <FileIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                          <span className="truncate w-full">{file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(i)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, attachments.length > 0 ? attachments : undefined)}
                placeholder={isRecording ? "Listening..." : "Ask Anything"}
                className="w-full resize-none border-none !bg-transparent dark:!bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[52px] max-h-[150px] overflow-y-auto"
                rows={1}
              />

              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,text/*"
              />

              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-[10px] hover:bg-accent text-muted-foreground hover:text-foreground h-auto w-auto"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Attach</p></TooltipContent>
                  </Tooltip>

                  <div className="relative flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                          className={cn(
                            "p-2 rounded-[10px] hover:bg-accent h-auto w-auto transition-colors relative",
                            (isCanvasOpen || isDeepResearchActive || isImagesActive || isToolsMenuOpen)
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Settings2 className="w-4 h-4" />
                          {(isCanvasOpen || isDeepResearchActive || isImagesActive) && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Tools</p></TooltipContent>
                    </Tooltip>

                    {/* Desktop Slide-out Menu */}
                    <div
                      className={cn(
                        "hidden md:flex absolute left-full ml-2 items-center gap-2 transition-all duration-200 ease-out origin-left z-20",
                        isToolsMenuOpen ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-95 -translate-x-2 pointer-events-none"
                      )}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-8 gap-2 bg-background transition-colors", isCanvasOpen && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                        onClick={() => toggleTool('canvas')}
                      >
                        <TerminalSquare className="w-4 h-4" />
                        <span>Canvas</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-8 gap-2 bg-background transition-colors", isDeepResearchActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                        onClick={() => toggleTool('deepResearch')}
                      >
                        <Microscope className="w-4 h-4" />
                        <span>Deep Research</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-8 gap-2 bg-background transition-colors", isImagesActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                        onClick={() => toggleTool('images')}
                      >
                        <ImageIconLucide className="w-4 h-4" />
                        <span>Images</span>
                      </Button>
                    </div>

                    {/* Mobile Bottom Sheet (Drawer) */}
                    <Drawer open={isMobile && isToolsMenuOpen} onOpenChange={setIsToolsMenuOpen}>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Power Tools</DrawerTitle>
                          <DrawerDescription>Select tools to enhance your chat capability.</DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 flex flex-col gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            className={cn("w-full justify-start gap-4 h-12 text-base", isCanvasOpen && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                            onClick={() => { toggleTool('canvas'); setIsToolsMenuOpen(false); }}
                          >
                            <TerminalSquare className="w-5 h-5" />
                            <span>Canvas</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className={cn("w-full justify-start gap-4 h-12 text-base", isDeepResearchActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                            onClick={() => { toggleTool('deepResearch'); setIsToolsMenuOpen(false); }}
                          >
                            <Microscope className="w-5 h-5" />
                            <span>Deep Research</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className={cn("w-full justify-start gap-4 h-12 text-base", isImagesActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-transparent")}
                            onClick={() => { toggleTool('images'); setIsToolsMenuOpen(false); }}
                          >
                            <ImageIconLucide className="w-5 h-5" />
                            <span>Images</span>
                          </Button>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (isProcessing) {
                            stopGeneration();
                          } else if (userInput.trim() || attachments.length > 0) {
                            onSend();
                          } else {
                            toggleRecording();
                          }
                        }}
                        className={cn(
                          "h-8 w-8 rounded-[10px] transition-all duration-200",
                          isProcessing
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : (userInput.trim() || attachments.length > 0)
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isProcessing ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (userInput.trim() || attachments.length > 0) ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <Mic className={cn("w-4 h-4", isRecording ? "animate-pulse text-red-500" : "")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isProcessing ? "Stop generating" : (userInput.trim() || attachments.length > 0) ? "Send message" : (isRecording ? "Stop Recording" : "Voice Input")}</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-[10px] bg-accent text-foreground hover:bg-accent/80"
                        onClick={() => setShowLiveConversation(true)}
                      >
                        <AudioLines className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Voice Mode</p></TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground">
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>

      <LiveConversation
        isOpen={showLiveConversation}
        onClose={() => setShowLiveConversation(false)}
        appTheme={theme === 'dark' || theme === 'system' ? 'dark' : 'light'}
        model="gemini-2.5-flash-native-audio-preview-12-2025"
      />
    </main>
  )
}
