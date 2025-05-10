"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "@/components/chat-message"
import {
  SendHorizontal,
  Paperclip,
  Bot,
  Cloud,
  CloudOff,
  Settings,
  FileText,
  Layers,
  Brain,
  Database,
  AlertCircle,
} from "lucide-react"
import { ChatWelcome } from "@/components/chat-welcome"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PipelineStatus } from "@/components/pipeline-status"
import type { OperationMode } from "@/components/mode-selector"
import { useApiConfig } from "@/hooks/use-api-config"
import { useAuth } from "@/contexts/auth-context"

interface ChatInterfaceProps {
  currentMode?: OperationMode
}

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Mock data for demonstration
const initialMessages = [
  {
    id: 1,
    role: "assistant" as const,
    content:
      "Hello! I'm your RAG Assistant. I can help you analyze and discuss your documents. Upload a document or ask me a question to get started.",
    timestamp: new Date(Date.now() - 60000),
  },
]

// Mock pipeline stages for manual mode
const pipelineStages = [
  {
    name: "OCR",
    status: "completed" as const,
    icon: <FileText className="h-4 w-4" />,
  },
  {
    name: "Parsing",
    status: "completed" as const,
    icon: <Layers className="h-4 w-4" />,
  },
  {
    name: "Chunking",
    status: "processing" as const,
    icon: <Layers className="h-4 w-4" />,
  },
  {
    name: "Embedding",
    status: "pending" as const,
    icon: <Brain className="h-4 w-4" />,
  },
  {
    name: "Vector DB",
    status: "pending" as const,
    icon: <Database className="h-4 w-4" />,
  },
]

export function ChatInterface({ currentMode = "online" }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPipeline, setShowPipeline] = useState(false)
  const [currentStage, setCurrentStage] = useState(2) // For demo, showing chunking in progress
  const [error, setError] = useState<string | null>(null)
  const { apiConfig, getFullUrl, getAuthHeaders, isLoaded } = useApiConfig()
  const { isAuthenticated } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Update welcome message based on mode
  useEffect(() => {
    const welcomeMessage = {
      id: 1,
      role: "assistant" as const,
      content: getWelcomeMessage(currentMode),
      timestamp: new Date(),
    }

    setMessages([welcomeMessage])

    // Show pipeline status in manual mode when a document is being processed
    setShowPipeline(currentMode === "manual")
  }, [currentMode])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const getWelcomeMessage = (mode: OperationMode) => {
    switch (mode) {
      case "online":
        return "Hello! I'm your RAG Assistant in online mode. I can help you analyze and discuss your documents with full cloud capabilities."
      case "offline":
        return "Hello! I'm your RAG Assistant in offline mode. I can help you with locally stored documents using PyTesseract for OCR and Llama 3 for text generation."
      case "manual":
        return "Hello! I'm your RAG Assistant in manual mode. You have full control over document processing and analysis steps. Configure each pipeline stage according to your needs."
    }
  }

  const getModeAlert = (mode: OperationMode) => {
    switch (mode) {
      case "offline":
        return (
          <Alert className="mb-4">
            <CloudOff className="h-4 w-4" />
            <AlertDescription>You're in offline mode using PyTesseract OCR and Llama 3 (8B) model.</AlertDescription>
          </Alert>
        )
      case "manual":
        return (
          <Alert className="mb-4">
            <Settings className="h-4 w-4" />
            <AlertDescription>Manual mode active. Configure and monitor each processing step.</AlertDescription>
          </Alert>
        )
      default:
        return null
    }
  }

  // Update the handleSendMessage function to handle CORS errors better
  const handleSendMessage = async () => {
    if (!input.trim()) return
    setError(null)

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      if (currentMode === "online" && isLoaded && isAuthenticated) {
        // Use the API for online mode
        try {
          console.log("Sending query to:", getFullUrl("queryEndpoint"))
          const response = await fetch(getFullUrl("queryEndpoint"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ text: input }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to get response from API" }))
            throw new Error(errorData.detail || "Failed to get response from API")
          }

          const data = await response.json()
          console.log("Query response:", data)

          const aiMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content: data.answer || "I couldn't find an answer to your question.",
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, aiMessage])
        } catch (err) {
          console.error("Query error:", err)
          if (err instanceof Error && err.toString().includes("CORS")) {
            throw new Error("CORS error: Your API server needs CORS configuration. Please check the backend setup.")
          } else {
            throw err
          }
        }
      } else {
        // Simulate response for offline and manual modes
        setTimeout(() => {
          let responseContent = ""

          switch (currentMode) {
            case "online":
              responseContent =
                "I've analyzed your documents using our cloud processing. Based on the context provided in your uploaded files, I can tell you that..."
              break
            case "offline":
              responseContent =
                "I've analyzed your locally stored documents using PyTesseract OCR and Llama 3. Based on the available local context, I can tell you that..."
              break
            case "manual":
              responseContent =
                "I've prepared the analysis steps. Would you like me to: 1) Extract key entities, 2) Perform semantic search, or 3) Generate a summary?"
              break
          }

          const aiMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content: responseContent,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, aiMessage])
        }, 2000)
      }
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getModeIcon = () => {
    switch (currentMode) {
      case "online":
        return <Cloud className="h-4 w-4" />
      case "offline":
        return <CloudOff className="h-4 w-4" />
      case "manual":
        return <Settings className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {messages.length <= 1 ? (
          <ChatWelcome currentMode={currentMode} />
        ) : (
          <ScrollArea className="h-full p-4">
            <div className="max-w-3xl mx-auto space-y-4 pb-20">
              {currentMode !== "online" && getModeAlert(currentMode)}

              {showPipeline && currentMode === "manual" && (
                <PipelineStatus stages={pipelineStages} currentStage={currentStage} />
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-3xl relative">
          <Textarea
            placeholder={
              currentMode === "manual"
                ? "Enter instructions for manual processing..."
                : "Ask a question about your documents..."
            }
            className="min-h-[60px] resize-none pr-20 py-4"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || (currentMode === "online" && !isAuthenticated)}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={isLoading || (currentMode === "online" && !isAuthenticated)}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || (currentMode === "online" && !isAuthenticated)}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-3xl mt-2 flex items-center justify-center gap-2">
          {getModeIcon()}
          <p className="text-xs text-center text-muted-foreground">
            {currentMode === "online"
              ? isAuthenticated
                ? "RAG Assistant can make mistakes. Consider checking important information."
                : "Please log in to use online mode."
              : currentMode === "offline"
                ? "Offline mode: Using PyTesseract OCR and Llama 3 (8B)."
                : "Manual mode: You control the processing steps."}
          </p>
        </div>
      </div>
    </div>
  )
}
