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
import { useAuth } from "@/contexts/auth-context"

interface FileUploaderProps {
  currentMode: OperationMode
}

export function FileUploader({ currentMode }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { apiConfig, getFullUrl, getAuthHeaders, isLoaded } = useApiConfig()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()

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
      if (currentMode === "online" && isAuthenticated) {
        uploadFiles(Array.from(e.dataTransfer.files))
      } else if (currentMode !== "offline") {
        simulateUpload(Array.from(e.dataTransfer.files))
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (currentMode === "online" && isAuthenticated) {
        uploadFiles(Array.from(e.target.files))
      } else if (currentMode !== "offline") {
        simulateUpload(Array.from(e.target.files))
      }
    }
  }

  // Improved upload function with better progress tracking
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)

        // Update progress for current file
        setProgress(Math.round((i / files.length) * 100))

        try {
          console.log("Uploading to:", getFullUrl("uploadEndpoint"))

          // Create a mock XMLHttpRequest to track upload progress
          const xhr = new XMLHttpRequest()

          // Set up progress tracking
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const fileProgress = Math.round((event.loaded / event.total) * 100)
              const overallProgress = Math.round(((i + fileProgress / 100) / files.length) * 100)
              console.log(`Upload progress: ${fileProgress}%, Overall: ${overallProgress}%`)
              setProgress(overallProgress)
            }
          })

          // Create a promise to handle the XHR
          const uploadPromise = new Promise<any>((resolve, reject) => {
            xhr.open("POST", getFullUrl("uploadEndpoint"))

            // Add authorization header
            const authHeaders = getAuthHeaders()
            if (authHeaders.Authorization) {
              xhr.setRequestHeader("Authorization", authHeaders.Authorization)
            }

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText)
                  resolve(response)
                } catch (e) {
                  resolve({ message: "File uploaded successfully", file_id: `file-${Date.now()}` })
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`))
              }
            }

            xhr.onerror = () => {
              reject(new Error("Network error occurred during upload"))
            }

            xhr.send(formData)
          })

          // Wait for the upload to complete
          const result = await uploadPromise
          console.log("Upload result:", result)

          // Add document to the list
          if (window.addDocument) {
            window.addDocument({
              id: result.file_id || `file-${Date.now()}`,
              name: file.name,
              display_name: file.name,
            })
          }

          toast({
            title: "File Uploaded",
            description: `${file.name} has been uploaded successfully.`,
          })
        } catch (err) {
          console.error("Upload error:", err)
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
        setProgress(0)
      }, 500)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload file",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  // Improved simulation with actual files
  const simulateUpload = (files: File[]) => {
    setIsUploading(true)
    setProgress(0)

    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 5
      setProgress(currentProgress)

      if (currentProgress >= 100) {
        clearInterval(interval)

        // Add documents to local storage
        files.forEach((file) => {
          if (window.addDocument) {
            window.addDocument({
              id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: file.name,
              display_name: file.name,
            })
          }
        })

        setTimeout(() => {
          setIsUploading(false)
          setProgress(0)

          toast({
            title: "Processing Complete",
            description: `${files.length} file(s) processed successfully.`,
          })
        }, 500)
      }
    }, 100)
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

  if (currentMode === "online" && !isAuthenticated) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please log in to upload documents.</AlertDescription>
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
              {progress < 100
                ? `${currentMode === "manual" ? "Preparing" : "Processing"} document... ${progress}%`
                : "Finalizing..."}
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
