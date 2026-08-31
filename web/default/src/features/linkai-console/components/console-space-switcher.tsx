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
import { Building2, ChevronDown, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type ConsoleSpaceSwitcherProps = {
  collapsed: boolean
}

export function ConsoleSpaceSwitcher(props: ConsoleSpaceSwitcherProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const canAccessEnterprise =
    (useAuthStore((state) => state.auth.user?.role) ?? ROLE.GUEST) >= ROLE.ADMIN

  return (
    <div className='relative'>
      <button
        type='button'
        aria-expanded={open}
        aria-label={t('Current space')}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-white/10',
          props.collapsed && 'justify-center p-1'
        )}
      >
        <span className='flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold text-black'>
          C
        </span>
        {!props.collapsed && (
          <>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-medium text-white'>
                {t('Personal developer space')}
              </span>
              <span className='block text-xs text-white/45'>C-END</span>
            </span>
            <ChevronDown
              className={cn('size-4 text-white/50', open && 'rotate-180')}
              aria-hidden='true'
            />
          </>
        )}
      </button>
      {open && !props.collapsed && (
        <div className='absolute top-[calc(100%+0.5rem)] left-0 z-50 w-72 rounded-xl border border-white/10 bg-[#111] p-2 shadow-2xl'>
          <button
            type='button'
            role='menuitem'
            onClick={() => setOpen(false)}
            className='flex w-full items-center gap-3 rounded-lg bg-white px-3 py-3 text-left text-black'
          >
            <UserRound className='size-4' aria-hidden='true' />
            <span className='text-sm font-medium'>
              {t('Personal developer space')}
            </span>
          </button>
          {canAccessEnterprise && (
            <Link
              to='/subscriptions'
              role='menuitem'
              onClick={() => setOpen(false)}
              className='mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              <Building2 className='size-4' aria-hidden='true' />
              {t('Enterprise team space')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
