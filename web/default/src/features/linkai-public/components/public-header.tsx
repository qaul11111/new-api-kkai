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
import { Link, useLocation } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { LINKAI_HOME_ASSETS } from '@/features/home/components/linkai-home/assets'
import { useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import {
  LINKAI_HEADER_DESKTOP_ACTIONS_CLASS,
  LINKAI_HEADER_EXPANDED_CONTAINER_CLASS,
  LINKAI_HEADER_EXPANDED_LOGO_CLASS,
  LINKAI_HEADER_EXPANDED_NAV_CLASS,
  LINKAI_HEADER_EXPANDED_ROW_CLASS,
} from './header-geometry'
import { showsConsoleHeaderActions } from './public-header-mode'

type PublicHeaderLink = {
  href: '/' | '/pricing' | '/rankings' | '/about' | '/docs'
  label: string
}

function PublicNavigationLink(props: {
  link: PublicHeaderLink
  className: string
  onClick?: () => void
}) {
  if (props.link.href === '/docs') {
    return (
      <a
        href={props.link.href}
        className={props.className}
        onClick={props.onClick}
      >
        {props.link.label}
      </a>
    )
  }

  return (
    <Link
      to={props.link.href}
      className={props.className}
      onClick={props.onClick}
    >
      {props.link.label}
    </Link>
  )
}

type LinkAiPublicHeaderProps = {
  /** Adds authenticated-console tools without changing public-page output. */
  consoleMode?: boolean
  /** Temporarily hides console search and theme controls without affecting the public header. */
  showConsoleSearchAndTheme?: boolean
}

type NotificationSurface = 'desktop' | 'mobile'

export function LinkAiPublicHeader(props: LinkAiPublicHeaderProps) {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationSurface, setNotificationSurface] =
    useState<NotificationSurface | null>(null)
  const user = useAuthStore((state) => state.auth.user)
  const notifications = useNotifications()
  const showConsoleActions = showsConsoleHeaderActions(props.consoleMode)
  const showConsoleSearchAndTheme =
    showConsoleActions && props.showConsoleSearchAndTheme !== false

  const handleNotificationOpenChange =
    (surface: NotificationSurface) => (open: boolean) => {
      setNotificationSurface(open ? surface : null)
      notifications.setPopoverOpen(open)
    }

  const links: PublicHeaderLink[] = [
    { href: '/', label: t('Home') },
    { href: '/pricing', label: t('Model Square') },
    { href: '/rankings', label: t('Rankings') },
    { href: '/docs', label: t('Docs') },
    { href: '/about', label: t('About') },
  ]

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-black/95 text-white backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10',
        props.consoleMode && 'shrink-0'
      )}
    >
      <div
        data-testid='linkai-header-container'
        className={cn('mx-auto w-full', LINKAI_HEADER_EXPANDED_CONTAINER_CLASS)}
      >
        <div
          data-testid='linkai-header-row'
          className={cn(
            'relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 border',
            LINKAI_HEADER_EXPANDED_ROW_CLASS
          )}
        >
          <Link
            to='/'
            className='col-start-1 row-start-1 flex shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
            aria-label={t('Home')}
          >
            <img
              src={LINKAI_HOME_ASSETS.brandLogoHeader}
              alt='LinkAI'
              width={242}
              height={40}
              className={cn('h-auto', LINKAI_HEADER_EXPANDED_LOGO_CLASS)}
            />
          </Link>

          <nav
            aria-label={t('Primary navigation')}
            data-testid='linkai-primary-desktop-navigation'
            className={cn(
              'row-start-1 hidden items-center justify-center gap-1 xl:flex',
              LINKAI_HEADER_EXPANDED_NAV_CLASS
            )}
          >
            {links.map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <PublicNavigationLink
                  key={link.href}
                  link={link}
                  className={cn(
                    'rounded-full px-[clamp(0.55rem,0.85vw,1rem)] py-1.5 text-base whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white',
                    active ? 'text-white' : 'text-white/55 hover:text-white'
                  )}
                />
              )
            })}
          </nav>

          <div
            data-testid='linkai-header-desktop-actions'
            className={cn(
              LINKAI_HEADER_DESKTOP_ACTIONS_CLASS,
              props.consoleMode && 'w-auto min-w-max'
            )}
          >
            {showConsoleSearchAndTheme && (
              <div
                data-testid='linkai-console-desktop-actions'
                className='hidden items-center gap-1 lg:flex [&_button]:text-white [&_button:hover]:bg-white/10'
              >
                <Search className='hidden text-white placeholder:text-white/45 2xl:flex' />
                <ConfigDrawer />
              </div>
            )}
            <div className='[&_button]:text-white [&_button:hover]:bg-white/10'>
              <LanguageSwitcher />
            </div>
            <NotificationPopover
              open={
                notifications.popoverOpen && notificationSurface === 'desktop'
              }
              onOpenChange={handleNotificationOpenChange('desktop')}
              unreadCount={notifications.unreadCount}
              activeTab={notifications.activeTab}
              onTabChange={notifications.setActiveTab}
              notice={notifications.notice}
              announcements={notifications.announcements}
              loading={notifications.loading}
              className='text-white hover:bg-white/10 hover:text-white'
            />
            {user ? (
              <div className='ml-2 flex size-10 items-center justify-center rounded-full border-2 border-[#7357ff] bg-[linear-gradient(135deg,#7ee8ff,#ff78bd)] [&_[data-slot=avatar]]:size-8 [&_button]:size-8'>
                <ProfileDropdown />
              </div>
            ) : (
              <>
                <Link
                  to='/sign-in'
                  className='ml-2 rounded-lg border border-white/20 bg-[#0f0f0f] px-8 py-2.5 text-sm text-white transition hover:border-white/45 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                >
                  {t('Sign in')}
                </Link>
                <Link
                  to='/sign-up'
                  className='rounded-lg bg-white px-8 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                >
                  {t('Sign up')}
                </Link>
              </>
            )}
          </div>

          <button
            type='button'
            className='relative col-start-3 row-start-1 flex size-11 items-center justify-center justify-self-end rounded-full border border-white/25 bg-black/35 backdrop-blur-md xl:hidden'
            aria-expanded={mobileOpen}
            aria-controls='linkai-public-mobile-navigation'
            aria-label={t('Toggle navigation menu')}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>

      <div
        id='linkai-public-mobile-navigation'
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
        className={cn(
          'absolute inset-x-0 overflow-hidden border-b border-white/10 bg-black/95 px-5 transition-[max-height,opacity] duration-300 xl:hidden',
          'top-20',
          mobileOpen ? 'max-h-[32rem] pb-5 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className='flex flex-col' aria-label={t('Primary navigation')}>
          {links.map((link) => (
            <PublicNavigationLink
              key={link.href}
              link={link}
              className='border-b border-white/10 py-3 text-white/75 last:border-0'
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showConsoleActions && (
          <div
            data-testid='linkai-console-mobile-actions'
            className='[&_[aria-label="Open theme settings"]]:flex! mt-4 grid grid-cols-2 gap-2 border-b border-white/10 pb-4 [&_button]:text-white [&_button:hover]:bg-white/10'
          >
            {showConsoleSearchAndTheme && (
              <>
                <Search className='w-full text-white placeholder:text-white/45' />
                <ConfigDrawer />
              </>
            )}
            <LanguageSwitcher />
            <NotificationPopover
              open={
                notifications.popoverOpen && notificationSurface === 'mobile'
              }
              onOpenChange={handleNotificationOpenChange('mobile')}
              unreadCount={notifications.unreadCount}
              activeTab={notifications.activeTab}
              onTabChange={notifications.setActiveTab}
              notice={notifications.notice}
              announcements={notifications.announcements}
              loading={notifications.loading}
              className='text-white hover:bg-white/10 hover:text-white'
            />
            {user && <ProfileDropdown />}
          </div>
        )}
        <div className='mt-4 grid grid-cols-2 gap-3'>
          <Link
            to={user ? '/dashboard' : '/sign-in'}
            className='rounded-xl border border-white/20 px-4 py-3 text-center text-sm'
          >
            {user ? t('Go to Dashboard') : t('Sign in')}
          </Link>
          <Link
            to={user ? '/dashboard' : '/sign-up'}
            className='rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black'
          >
            {user ? t('Console') : t('Sign up')}
          </Link>
        </div>
      </div>
    </header>
  )
}
