import type React from "react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen w-full overflow-hidden bg-background">{children}</div>
}
