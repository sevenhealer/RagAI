import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Trash2, CloudOff, Cloud } from "lucide-react"
import type { OperationMode } from "@/components/mode-selector"

interface DocumentListProps {
  currentMode: OperationMode
}

// Mock data for demonstration
const documents = [
  { id: 1, name: "Research Paper.pdf", status: "processed", pages: 12, location: "cloud" },
  { id: 2, name: "Meeting Notes.docx", status: "processing", pages: 3, location: "cloud" },
  { id: 3, name: "Product Specs.pdf", status: "processed", pages: 8, location: "local" },
  { id: 4, name: "Financial Report.pdf", status: "processed", pages: 24, location: "cloud" },
  { id: 5, name: "User Interviews.txt", status: "failed", pages: 5, location: "local" },
]

export function DocumentList({ currentMode }: DocumentListProps) {
  // Filter documents based on mode
  const filteredDocuments = documents.filter((doc) => {
    if (currentMode === "offline") {
      return doc.location === "local"
    }
    return true
  })

  if (filteredDocuments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {currentMode === "offline" ? (
          <>
            <CloudOff className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No local documents available in offline mode</p>
          </>
        ) : (
          <p className="text-sm">No documents found</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filteredDocuments.map((doc) => (
        <div key={doc.id} className="group flex items-center justify-between rounded-md border p-2 hover:bg-accent">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium truncate max-w-[180px]">{doc.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{doc.pages} pages</p>
                {doc.status === "processed" && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                    Ready
                  </Badge>
                )}
                {doc.status === "processing" && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                    Processing
                  </Badge>
                )}
                {doc.status === "failed" && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                    Failed
                  </Badge>
                )}
                {doc.location === "cloud" ? (
                  <Cloud className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <CloudOff className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  )
}
  