'use client'

import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const { user, workspaceName, logout } = useAuth()

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-14 flex items-center gap-3 border-b border-border bg-card px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <span className="text-base font-semibold text-foreground tracking-tight">Beem</span>

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {workspaceName && (
        <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5 hidden sm:block">
          {workspaceName}
        </span>
      )}

      {user && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  )
}
