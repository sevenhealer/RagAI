"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DocumentList } from "@/components/document-list"
import { FileUploader } from "@/components/file-uploader"
import { ThemeToggle } from "@/components/theme-toggle"
import { ModeSelector, type OperationMode } from "@/components/mode-selector"
import { Plus, Settings, Sliders, Menu, LogOut, User } from "lucide-react"
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface SidebarProps {
  currentMode: OperationMode
  onModeChange: (mode: OperationMode) => void
}

export function Sidebar({ currentMode, onModeChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleLogin = () => {
    router.push("/login")
  }

  const sidebarContent = (
    <>
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

          {currentMode === "online" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Sliders className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>API Configuration</DialogTitle>
                  <DialogDescription>Configure API endpoints for online processing</DialogDescription>
                </DialogHeader>
                <ApiConfig />
              </DialogContent>
            </Dialog>
          )}
        </div>
        <FileUploader currentMode={currentMode} />
      </div>
      <ScrollArea className="flex-1 px-4">
        <DocumentList currentMode={currentMode} />
      </ScrollArea>
      <div className="p-4">
        <Separator className="mb-4" />
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user?.username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 px-2">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogin}>
            Login
          </Button>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-2 w-[300px]">
            <div className="flex h-full flex-col">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar - hidden on small screens */}
      <div className="hidden md:flex h-full w-[350px] flex-col border-r">{sidebarContent}</div>
    </>
  )
}
