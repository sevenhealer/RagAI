"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, CloudOff, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OperationMode } from "@/components/mode-selector"
import { useApiConfig } from "@/hooks/use-api-config"
import { useToast } from "@/hooks/use-toast"

interface FileUploaderProps {
  currentMode: OperationMode
}

export function FileUploader({ currentMode }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { apiConfig, getFullUrl, isLoaded } = useApiConfig()
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files.length > 0) {
      if (currentMode === "online") {
        uploadFiles(Array.from(e.dataTransfer.files))
      } else {
        simulateUpload()
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (currentMode === "online") {
        uploadFiles(Array.from(e.target.files))
      } else {
        simulateUpload()
      }
    }
  }

  // Update the uploadFiles function to handle CORS errors better
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)

        // Update progress for multiple files
        setProgress(Math.round((i / files.length) * 100))

        try {
          const response = await fetch(getFullUrl("uploadEndpoint"), {
            method: "POST",
            body: formData,
            // Add these headers for better CORS handling
            headers: {
              // Don't set Content-Type with FormData as it will be set automatically with the boundary
            },
            // Ensure credentials are included if your API requires authentication
            credentials: "include",
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to upload file" }))
            throw new Error(errorData.detail || "Failed to upload file")
          }

          const result = await response.json()

          toast({
            title: "File Uploaded",
            description: `${file.name} has been uploaded successfully.`,
          })
        } catch (err) {
          if (err instanceof Error && err.message.includes("CORS")) {
            throw new Error("CORS error: Your API server needs CORS configuration. Please check the backend setup.")
          } else {
            throw err
          }
        }
      }

      setProgress(100)
      setTimeout(() => {
        setIsUploading(false)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload file",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const simulateUpload = () => {
    setIsUploading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsUploading(false)
          }, 500)
          return 100
        }
        return newProgress
      })
    }, 300)
  }

  if (currentMode === "offline") {
    return (
      <Alert className="mb-4">
        <CloudOff className="h-4 w-4" />
        <AlertDescription>
          Document upload is disabled in offline mode. Switch to online mode to upload new documents.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div
      className={`mb-4 rounded-lg border-2 border-dashed p-4 transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-medium">Upload Documents</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {currentMode === "manual"
            ? "Upload documents for manual processing"
            : "Drag & drop or click to upload PDF, DOCX, or TXT files"}
        </p>

        {isUploading ? (
          <div className="w-full space-y-2">
            <Progress value={progress} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground">
              {currentMode === "manual" ? "Preparing document..." : "Processing document..."}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" className="relative" onClick={() => document.getElementById("file-upload")?.click()}>
              <input
                id="file-upload"
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleFileChange}
                multiple
                accept=".pdf,.docx,.txt"
              />
              Select Files
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
