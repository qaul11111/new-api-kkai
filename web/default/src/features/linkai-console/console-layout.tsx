/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Menu } from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimatedOutlet } from '@/components/page-transition'
import { SkipToMain } from '@/components/skip-to-main'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { LayoutProvider } from '@/context/layout-provider'
import { LinkAiPublicHeader } from '@/features/linkai-public/components/public-header'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { ConsoleSidebar } from './components/console-sidebar'

import './linkai-console-theme.css'

const SIDEBAR_STORAGE_KEY = 'linkai-console-sidebar-collapsed'

function getInitialCollapsedState(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

export function LinkAiConsoleLayout() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState)
  const userRole = useAuthStore((state) => state.auth.user?.role ?? ROLE.GUEST)
  const isAdmin = userRole >= ROLE.ADMIN

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <LayoutProvider>
      <SidebarProvider
        open={!collapsed}
        onOpenChange={(open) => setCollapsed(!open)}
        style={
          {
            '--app-header-height': '80px',
            '--sidebar-width-icon': '3.25rem',
          } as CSSProperties
        }
        className={cn(
          'dark flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-black text-white',
          !isAdmin && 'linkai-user-console-shell'
        )}
      >
        <SkipToMain />
        <LinkAiPublicHeader consoleMode showConsoleSearchAndTheme={false} />
        <div
          data-testid='linkai-console-shell-body'
          className='flex min-h-0 w-full flex-1 overflow-hidden'
        >
          <ConsoleSidebar />
          <SidebarInset className='@container/content h-full min-h-0 min-w-0 overflow-hidden bg-black text-white'>
            <div className='flex h-12 shrink-0 items-center border-b border-white/10 px-4 md:hidden'>
              <SidebarTrigger className='border-white/10 text-white hover:bg-white/10 hover:text-white'>
                <Menu aria-hidden='true' />
              </SidebarTrigger>
              <span className='ml-3 text-sm font-medium text-white/65'>
                {t('Console')}
              </span>
            </div>
            <div
              id='main-content'
              className='flex min-h-0 flex-1 flex-col overflow-hidden'
            >
              <AnimatedOutlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </LayoutProvider>
  )
}
