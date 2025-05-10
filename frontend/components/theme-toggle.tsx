"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only show the toggle after hydration to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`}
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${currentTheme === "dark" ? "scale-0 -rotate-90" : "scale-100 rotate-0"}`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${currentTheme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"}`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
