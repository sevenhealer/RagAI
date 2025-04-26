import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DocumentList } from "@/components/document-list"
import { FileUploader } from "@/components/file-uploader"
import { ThemeToggle } from "@/components/theme-toggle"
import { ModeSelector, type OperationMode } from "@/components/mode-selector"
import { Plus, Settings, Sliders } from "lucide-react"
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

interface SidebarProps {
  currentMode: OperationMode
  onModeChange: (mode: OperationMode) => void
}

export function Sidebar({ currentMode, onModeChange }: SidebarProps) {
  return (
    <div className="flex h-full w-[350px] flex-col border-r">
      <div className="flex h-14 items-center px-4">
        <h1 className="text-xl font-semibold">RAG Assistant</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="p-4 flex items-center justify-between">
        <Button className="justify-start gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <ModeSelector currentMode={currentMode} onModeChange={onModeChange} />
      </div>
      <Separator />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Your Documents</h2>

          {(currentMode === "offline" || currentMode === "manual") && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Sliders className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {currentMode === "offline" ? "Offline Mode Configuration" : "Manual Pipeline Configuration"}
                  </DialogTitle>
                  <DialogDescription>
                    {currentMode === "offline"
                      ? "Configure OCR and LLM models for offline processing"
                      : "Configure each step of the document processing pipeline"}
                  </DialogDescription>
                </DialogHeader>

                {currentMode === "offline" ? <OfflineConfig /> : <ManualPipelineConfig />}
              </DialogContent>
            </Dialog>
          )}
        </div>
        <FileUploader currentMode={currentMode} />
      </div>
      <ScrollArea className="flex-1 px-4">
        <DocumentList currentMode={currentMode} />
      </ScrollArea>
      <div className="p-4 text-xs text-muted-foreground">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between">
          <span>© 2024 RAG Assistant</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
