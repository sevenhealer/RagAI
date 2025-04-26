"use client"
import { Check, Cloud, CloudOff, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OfflineConfig } from "@/components/config/offline-config"
import { ManualPipelineConfig } from "@/components/config/manual-pipeline-config"
import { ApiConfig } from "@/components/config/api-config"
import { useState } from "react"

export type OperationMode = "online" | "offline" | "manual"

interface ModeSelectorProps {
  currentMode: OperationMode
  onModeChange: (mode: OperationMode) => void
}

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  const [configOpen, setConfigOpen] = useState(false)

  const getModeIcon = (mode: OperationMode) => {
    switch (mode) {
      case "online":
        return <Cloud className="h-4 w-4" />
      case "offline":
        return <CloudOff className="h-4 w-4" />
      case "manual":
        return <Settings className="h-4 w-4" />
    }
  }

  const getModeLabel = (mode: OperationMode) => {
    switch (mode) {
      case "online":
        return "Online Mode"
      case "offline":
        return "Offline Mode"
      case "manual":
        return "Manual Mode"
    }
  }

  const getModeColor = (mode: OperationMode) => {
    switch (mode) {
      case "online":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "offline":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "manual":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    }
  }

  const handleModeChange = (mode: OperationMode) => {
    onModeChange(mode)
    if (mode === "online" || mode === "offline" || mode === "manual") {
      setConfigOpen(true)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {getModeIcon(currentMode)}
            <Badge variant="outline" className={getModeColor(currentMode)}>
              {getModeLabel(currentMode)}
            </Badge>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleModeChange("online")} className="gap-2">
            <Cloud className="h-4 w-4" />
            <span>Online Mode</span>
            {currentMode === "online" && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleModeChange("offline")} className="gap-2">
            <CloudOff className="h-4 w-4" />
            <span>Offline Mode</span>
            {currentMode === "offline" && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleModeChange("manual")} className="gap-2">
            <Settings className="h-4 w-4" />
            <span>Manual Mode</span>
            {currentMode === "manual" && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentMode === "online"
                ? "Online Mode Configuration"
                : currentMode === "offline"
                  ? "Offline Mode Configuration"
                  : "Manual Pipeline Configuration"}
            </DialogTitle>
            <DialogDescription>
              {currentMode === "online"
                ? "Configure API endpoints for online processing"
                : currentMode === "offline"
                  ? "Configure OCR and LLM models for offline processing"
                  : "Configure each step of the document processing pipeline"}
            </DialogDescription>
          </DialogHeader>

          {currentMode === "online" ? (
            <ApiConfig />
          ) : currentMode === "offline" ? (
            <OfflineConfig />
          ) : currentMode === "manual" ? (
            <ManualPipelineConfig />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
