import { Button } from "@/components/ui/button"
import { MessageSquare, Cloud, CloudOff, Settings, Sliders } from "lucide-react"
import type { OperationMode } from "@/components/mode-selector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { OfflineConfig } from "@/components/config/offline-config"
import { ManualPipelineConfig } from "@/components/config/manual-pipeline-config"
import { ApiConfig } from "@/components/config/api-config"

interface ChatWelcomeProps {
  currentMode: OperationMode
}

export function ChatWelcome({ currentMode }: ChatWelcomeProps) {
  const getModeIcon = () => {
    switch (currentMode) {
      case "online":
        return <Cloud className="h-10 w-10 text-primary" />
      case "offline":
        return <CloudOff className="h-10 w-10 text-amber-500" />
      case "manual":
        return <Settings className="h-10 w-10 text-blue-500" />
    }
  }

  const getModeTitle = () => {
    switch (currentMode) {
      case "online":
        return "Online Mode"
      case "offline":
        return "Offline Mode"
      case "manual":
        return "Manual Mode"
    }
  }

  const getModeDescription = () => {
    switch (currentMode) {
      case "online":
        return "Upload your documents and chat with an AI that understands their content using cloud-based processing with your FastAPI backend."
      case "offline":
        return "Work with locally stored documents without internet connectivity. Choose from PyTesseract, EasyOCR, or multimodal OCR, and select from downloaded Ollama models."
      case "manual":
        return "Take control of the document processing pipeline. Configure OCR, parsing, chunking, embeddings, vector database, and LLM options for maximum customization."
    }
  }

  const getPrimaryAction = () => {
    switch (currentMode) {
      case "online":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sliders className="h-4 w-4" />
                Configure API Endpoints
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Online Mode Configuration</DialogTitle>
                <DialogDescription>Configure API endpoints for online processing</DialogDescription>
              </DialogHeader>
              <ApiConfig />
            </DialogContent>
          </Dialog>
        )
      case "offline":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sliders className="h-4 w-4" />
                Configure Offline Mode
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Offline Mode Configuration</DialogTitle>
                <DialogDescription>Configure OCR and LLM models for offline processing</DialogDescription>
              </DialogHeader>
              <OfflineConfig />
            </DialogContent>
          </Dialog>
        )
      case "manual":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Settings className="h-4 w-4" />
                Configure Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Manual Pipeline Configuration</DialogTitle>
                <DialogDescription>Configure each step of the document processing pipeline</DialogDescription>
              </DialogHeader>
              <ManualPipelineConfig />
            </DialogContent>
          </Dialog>
        )
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center p-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          {getModeIcon()}
        </div>
        <h2 className="mb-2 text-2xl font-bold">Welcome to RAG Assistant</h2>
        <h3 className="mb-2 text-lg font-medium text-muted-foreground">{getModeTitle()}</h3>
        <p className="mb-6 text-muted-foreground">{getModeDescription()}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {getPrimaryAction()}
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            View Examples
          </Button>
        </div>
      </div>
    </div>
  )
}
