"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Trash2, CloudOff, Cloud, RefreshCw } from "lucide-react"
import type { OperationMode } from "@/components/mode-selector"
import { useToast } from "@/hooks/use-toast"
import { useApiConfig } from "@/hooks/use-api-config"
import { useAuth } from "@/contexts/auth-context"

interface Document {
  id: string
  name: string
  display_name: string
  status: "processed" | "processing" | "failed"
  pages?: number
  location: "cloud" | "local"
  timestamp?: string
}

interface DocumentListProps {
  currentMode: OperationMode
}

export function DocumentList({ currentMode }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { apiConfig, getFullUrl, getAuthHeaders, isLoaded } = useApiConfig()
  const { isAuthenticated } = useAuth()

  // Function to fetch documents from API
  const fetchDocuments = async () => {
    if (currentMode !== "online" || !isLoaded || !isAuthenticated) {
      // Use local mock data for offline/manual modes
      const localDocs = localStorage.getItem("rag-documents")
      if (localDocs) {
        try {
          setDocuments(JSON.parse(localDocs))
        } catch (e) {
          console.error("Failed to parse local documents", e)
        }
      }
      return
    }

    setIsLoading(true)
    try {
      console.log("Fetching documents from:", getFullUrl("documentsEndpoint"))
      // Try to fetch from API
      const response = await fetch(getFullUrl("documentsEndpoint"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      }).catch((error) => {
        console.error("Fetch error:", error)
        return null
      })

      if (response && response.ok) {
        const data = await response.json()
        console.log("Documents API response:", data)

        if (data) {
          const transformedDocs = data.map((doc: any, index: number) => ({
            id: doc.name || `file-${index}`,
            name: doc.name || `file-${index}`,
            display_name: doc.display_name || "Unknown Document",
            status: "processed",
            location: "cloud",
            timestamp: new Date().toISOString(),
          }))
          setDocuments(transformedDocs)
          localStorage.setItem("rag-documents", JSON.stringify(transformedDocs))
        }
      } else {
        console.log("Using uploaded documents from localStorage")
        // If API fails, use documents from localStorage
        const localDocs = localStorage.getItem("rag-documents")
        if (localDocs) {
          try {
            setDocuments(JSON.parse(localDocs))
          } catch (e) {
            console.error("Failed to parse local documents", e)
            // Fallback to empty array
            setDocuments([])
          }
        } else {
          // No documents in localStorage
          setDocuments([])
        }
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch documents.",
        variant: "destructive",
      })

      // Try to use documents from localStorage
      const localDocs = localStorage.getItem("rag-documents")
      if (localDocs) {
        try {
          setDocuments(JSON.parse(localDocs))
        } catch (e) {
          console.error("Failed to parse local documents", e)
          // Fallback to empty array
          setDocuments([])
        }
      } else {
        // No documents in localStorage
        setDocuments([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Delete a document
  const deleteDocument = async (id: string, displayName: string) => {
    try {
      if (currentMode === "online" && isLoaded && isAuthenticated) {
        const response = await fetch(getFullUrl("deleteEndpoint"), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ file_name: displayName }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Failed to delete document" }))
          throw new Error(error.detail || "Failed to delete document")
        }
      }

      // Remove from local state regardless of API success
      const updatedDocs = documents.filter((doc) => doc.id !== id)
      setDocuments(updatedDocs)
      localStorage.setItem("rag-documents", JSON.stringify(updatedDocs))

      toast({
        title: "Document Deleted",
        description: "Document has been removed successfully.",
      })
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  // Add a document (called from FileUploader)
  const addDocument = (doc: { name: string; id: string; display_name: string }) => {
    console.log("Adding document:", doc)
    const newDoc = {
      id: doc.id,
      name: doc.id,
      display_name: doc.display_name || doc.name,
      status: "processed" as const,
      location: "cloud" as const,
      timestamp: new Date().toISOString(),
    }

    const updatedDocs = [...documents, newDoc]
    setDocuments(updatedDocs)
    localStorage.setItem("rag-documents", JSON.stringify(updatedDocs))
  }

  // Expose the addDocument function to window for FileUploader to use
  useEffect(() => {
    // @ts-ignore
    window.addDocument = addDocument

    // Initial fetch
    fetchDocuments()

    return () => {
      // @ts-ignore
      delete window.addDocument
    }
  }, [currentMode, isLoaded, isAuthenticated])

  // Filter documents based on mode
  const filteredDocuments = documents.filter((doc) => {
    if (currentMode === "offline") {
      return doc.location === "local"
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <RefreshCw className="mx-auto h-8 w-8 mb-2 opacity-50 animate-spin" />
        <p className="text-sm">Loading documents...</p>
      </div>
    )
  }

  if (filteredDocuments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {currentMode === "offline" ? (
          <>
            <CloudOff className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No local documents available in offline mode</p>
          </>
        ) : (
          <>
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No documents found</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">{filteredDocuments.length} document(s)</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchDocuments}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {filteredDocuments.map((doc) => (
        <div key={doc.id} className="group flex items-center justify-between rounded-md border p-2 hover:bg-accent">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium truncate max-w-[180px]">{doc.display_name}</p>
              <div className="flex items-center gap-2">
                {doc.pages && <p className="text-xs text-muted-foreground">{doc.pages} pages</p>}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteDocument(doc.id, doc.display_name)}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  )
}
