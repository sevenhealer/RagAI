import { Avatar } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </Avatar>
      )}

      <div className={`rounded-lg px-4 py-2 max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        <div className="mt-1 text-xs opacity-70">{formatTime(message.timestamp)}</div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </Avatar>
      )}
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date)
}
