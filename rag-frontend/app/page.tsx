"use client"

import { useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { OperationMode } from "@/components/mode-selector"

export default function Home() {
  const [currentMode, setCurrentMode] = useState<OperationMode>("online")

  return (
    <MainLayout>
      <Sidebar currentMode={currentMode} onModeChange={setCurrentMode} />
      <ChatInterface currentMode={currentMode} />
    </MainLayout>
  )
}
