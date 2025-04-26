"use client"

import { useState, useEffect } from "react"
import { useApiConfig } from "@/hooks/use-api-config"
import { useToast } from "@/hooks/use-toast"

export interface Document {
  id: string
  name: string
  status: "processed" | "processing" | "failed"
  pages?: number
  location: "cloud" | "local"
  timestamp: Date
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { apiConfig, getFullUrl, isLoaded } = useApiConfig()
  const { toast } = useToast()

  const fetchDocuments = async () => {
    if (!isLoaded) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${apiConfig.baseUrl}/documents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      
      const data = await response.json()
      
      // Transform API response to our Document interface
      const transformedDocs: Document[] = data.documents.map((doc: any) => ({
        id: doc.file_id || doc.id,
        name: doc.display_name || doc.name,
        status: doc.status || "processed",
        pages: doc.pages || undefined,
        location: doc.location || "cloud",
        timestamp: new Date(doc.timestamp || Date.now()),
      }))
      
      setDocuments(transformedDocs)
    } catch (err) {
      console.error("Error fetching documents:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch documents")
      
      // If API fails, use local storage as fallback
      const localDocs = localStorage.getItem("rag-documents")
      if (localDocs) {
        try {
          const parsedDocs = JSON.parse(localDocs)
          setDocuments(parsedDocs.map((doc: any) => ({
            ...doc,
            timestamp: new Date(doc.timestamp)
          })))
        } catch (e) {
          console.error("Failed to parse local documents", e)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const addDocument = (doc: Omit<Document, "id" | "timestamp">) => {
    const newDoc: Document = {
      ...doc,
      id: `local-${Date.now()}`,
      timestamp: new Date(),
    }
    
    setDocuments(prev => {
      const updated = [...prev, newDoc]
      // Save to local storage as backup
      localStorage.setItem("rag-documents", JSON.stringify(updated))
      return updated
    })
  }

  const removeDocument = async (id: string) => {
    try {
      if (id.startsWith("local-")) {
        // Local document, just remove from state
        setDocuments(prev => {
          const updated = prev.filter(doc => doc.id !== id)
          localStorage.setItem("rag-documents", JSON.stringify(updated))
          return updated
        })
        return
      }
      
      // Remote document, call API
      const response = await fetch(`${apiConfig.baseUrl}/documents/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete document")
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== id))
      toast({
        title: "Document Deleted",
        description: "The document has been removed successfully.",
      })
    } catch (err) {
      console.error("Error removing document:", err)
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  // Initial fetch
  useEffect(() => {
    if (isLoaded) {
      fetchDocuments()
    }
  }, [isLoaded])

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    addDocument,
    removeDocument,
  }
}
