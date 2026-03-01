'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  BarChart2,
  GitCompare,
  List,
  Upload,
  Tag,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Summary', href: '/summary', icon: BarChart2 },
  { label: 'Compare', href: '/compare', icon: GitCompare },
  { label: 'Transactions', href: '/transactions', icon: List },
  { label: 'Import', href: '/import', icon: Upload },
  { label: 'Classifiers', href: '/classifiers', icon: Tag },
  { label: 'Sources', href: '/sources', icon: Database },
]

const SIDEBAR_KEY = 'sidebar-collapsed'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_KEY, String(next))
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground truncate">Beem</span>
        )}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={onMobileClose}
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 mx-1 my-0.5 rounded-md text-sm transition-colors',
              isActive(href)
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border py-2">
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 px-3 py-2 mx-1 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-[calc(100%-8px)]',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border shrink-0 transition-all duration-200',
          collapsed ? 'w-14' : 'w-[220px]',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col bg-card border-r border-border md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
