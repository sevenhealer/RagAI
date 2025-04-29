import type React from "react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">{children}</div>
}
