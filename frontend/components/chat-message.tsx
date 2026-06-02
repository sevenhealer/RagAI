import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bot, User, FileText, Globe } from "lucide-react"

export interface Citation {
  source: string
  type: "corpus" | "web"
  url?: string
}

export interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
  citations?: Citation[]
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

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 border-t border-border/50 pt-2">
            <div className="mb-1 text-xs font-medium opacity-70">Sources</div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((c, i) =>
                c.type === "web" && c.url ? (
                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="secondary" className="gap-1 hover:bg-secondary/80">
                      <Globe className="h-3 w-3" />
                      {c.source}
                    </Badge>
                  </a>
                ) : (
                  <Badge key={i} variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {c.source}
                  </Badge>
                ),
              )}
            </div>
          </div>
        )}

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
