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
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { NavGroup } from '@/components/layout'
import type { NavGroup as NavGroupType } from '@/components/layout/types'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

function ConsoleNavigation() {
  const { t } = useTranslation()
  const { key, navGroups } = useSidebarView()
  const { state, setOpenMobile, toggleSidebar } = useSidebar()
  const isSuperAdmin =
    (useAuthStore((store) => store.auth.user?.role) ?? ROLE.GUEST) >=
    ROLE.SUPER_ADMIN
  const filteredNavGroups = useMemo<NavGroupType[]>(
    () => navGroups.filter((group) => group.id !== 'admin'),
    [navGroups]
  )

  return (
    <>
      <SidebarContent className='px-2 py-3 group-data-[collapsible=icon]:px-1'>
        <div key={key} className='flex flex-col'>
          {filteredNavGroups.map((group) => (
            <NavGroup key={group.id ?? group.title} {...group} />
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className='border-t border-white/10 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2'>
        {isSuperAdmin && (
          <Link
            to='/subscriptions'
            onClick={() => setOpenMobile(false)}
            aria-label={t('Admin')}
            className='flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-white/65 transition group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:gap-0 hover:bg-white/10 hover:text-white'
          >
            <ShieldCheck className='size-4 shrink-0' aria-hidden='true' />
            <span className='group-data-[collapsible=icon]:sr-only'>
              {t('Admin')}
            </span>
          </Link>
        )}
        <button
          type='button'
          onClick={toggleSidebar}
          aria-label={
            state === 'collapsed' ? t('Expand sidebar') : t('Collapse sidebar')
          }
          className='mt-2 flex h-8 w-full items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white'
        >
          {state === 'collapsed' ? (
            <ChevronRight className='size-4' aria-hidden='true' />
          ) : (
            <ChevronLeft className='size-4' aria-hidden='true' />
          )}
        </button>
      </SidebarFooter>
    </>
  )
}

export function ConsoleSidebar() {
  return (
    <Sidebar
      collapsible='icon'
      className={cn(
        'border-white/10! bg-black! text-white!',
        'group-data-[collapsible=icon]:[&_[data-sidebar=group]]:px-1',
        'group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:mx-auto',
        '[&_[data-sidebar=sidebar]]:bg-black! [&_[data-sidebar=menu-button]]:text-white/75 [&_[data-sidebar=menu-button]]:hover:bg-white/10 [&_[data-sidebar=menu-button][data-active=true]]:bg-white/15 [&_[data-sidebar=menu-button][data-active=true]]:text-white',
        '[&_[data-sidebar=group-label]]:text-white/50 [&_[data-sidebar=menu-sub]]:border-white/15'
      )}
    >
      <ConsoleNavigation />
    </Sidebar>
  )
}
