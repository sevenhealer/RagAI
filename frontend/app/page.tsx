"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { OperationMode } from "@/components/mode-selector"
import { useAuth } from "@/contexts/auth-context"

export default function Home() {
  const [currentMode, setCurrentMode] = useState<OperationMode>("online")
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentMode === "online") {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, currentMode, router])

  return (
    <MainLayout>
      <Sidebar currentMode={currentMode} onModeChange={setCurrentMode} />
      <ChatInterface currentMode={currentMode} />
    </MainLayout>
  )
}
