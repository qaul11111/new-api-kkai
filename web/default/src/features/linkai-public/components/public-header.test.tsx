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
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LinkAiPublicHeader } from './public-header'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.ComponentProps<'a'> & { to: string }) =>
    React.createElement('a', { ...props, href: to }, children),
  useLocation: () => '/',
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/search', () => ({
  Search: ({ className }: { className?: string }) => (
    <button type='button' aria-label='Search' className={className}>
      Search
    </button>
  ),
}))

vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => (
    <button
      type='button'
      aria-label='Open theme settings'
      className='max-md:hidden'
    >
      Settings
    </button>
  ),
}))

vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <button type='button'>Language</button>,
}))

vi.mock('@/components/notification-popover', () => ({
  NotificationPopover: ({
    open,
    onOpenChange,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => (
    <button
      type='button'
      aria-pressed={open}
      onClick={() => onOpenChange(!open)}
    >
      Notifications
    </button>
  ),
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <button type='button'>Profile</button>,
}))

vi.mock('@/features/home/components/linkai-home/assets', () => ({
  LINKAI_HOME_ASSETS: { brandLogoHeader: '/logo.png' },
}))

vi.mock('@/hooks/use-notifications', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react')

  return {
    useNotifications: () => {
      const [popoverOpen, setPopoverOpen] = ReactModule.useState(false)

      return {
        popoverOpen,
        setPopoverOpen,
        unreadCount: 0,
        activeTab: 'notice',
        setActiveTab: vi.fn(),
        notice: [],
        announcements: [],
        loading: false,
      }
    },
  }
})

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { auth: { user: { id: number } } }) => unknown
  ) => selector({ auth: { user: { id: 1 } } }),
}))

describe('LinkAiPublicHeader console mode', () => {
  it('adds independent desktop and mobile action surfaces only for the console', () => {
    render(<LinkAiPublicHeader consoleMode />)

    const desktop = screen.getByTestId('linkai-console-desktop-actions')
    const mobile = screen.getByTestId('linkai-console-mobile-actions')
    const desktopNavigation = screen.getByTestId(
      'linkai-primary-desktop-navigation'
    )
    const desktopActions = screen.getByTestId('linkai-header-desktop-actions')
    const header = screen.getByRole('banner')
    const logo = screen.getByRole('img', { name: 'LinkAI' })
    const navigation = document.querySelector<HTMLDivElement>(
      '#linkai-public-mobile-navigation'
    )

    expect(navigation).not.toBeNull()
    expect(navigation).toHaveAttribute('aria-hidden', 'true')
    expect(navigation).toHaveAttribute('inert')
    expect(desktopNavigation.className).toContain('absolute')
    expect(desktopNavigation.className).toContain('left-1/2')
    expect(desktopNavigation.className).toContain('h-[52px]')
    expect(desktopNavigation.className).not.toContain('justify-self-end')
    expect(desktopActions.className).toContain('w-auto')
    expect(header.className).toContain('shrink-0')
    expect(logo.className).toContain('lg:w-[190px]')
    expect(
      within(desktop).getByRole('button', { name: 'Search' }).className
    ).toContain('2xl:flex')

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )

    expect(navigation).toHaveAttribute('aria-hidden', 'false')
    expect(navigation).not.toHaveAttribute('inert')

    expect(
      within(desktop).getByRole('button', { name: 'Search' })
    ).toBeVisible()
    expect(
      within(desktop).getByRole('button', { name: 'Open theme settings' })
    ).toBeVisible()
    expect(within(mobile).getByRole('button', { name: 'Search' })).toBeVisible()
    expect(
      within(mobile).getByRole('button', { name: 'Open theme settings' })
    ).toBeVisible()
    expect(
      within(mobile).getByRole('button', { name: 'Language' })
    ).toBeVisible()
    expect(
      within(mobile).getByRole('button', { name: 'Notifications' })
    ).toBeVisible()
    expect(
      within(mobile).getByRole('button', { name: 'Profile' })
    ).toBeVisible()
    expect(mobile.className).toContain(
      '[&_[aria-label="Open theme settings"]]:flex!'
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )

    expect(navigation).toHaveAttribute('aria-hidden', 'true')
    expect(navigation).toHaveAttribute('inert')
  })

  it('does not add console actions to the public header by default', () => {
    render(<LinkAiPublicHeader />)

    expect(screen.getByTestId('linkai-header-container').className).toContain(
      'py-3'
    )
    expect(screen.getByTestId('linkai-header-row').className).toContain(
      'min-h-14'
    )
    expect(screen.getByRole('img', { name: 'LinkAI' }).className).toContain(
      'lg:w-[190px]'
    )
    expect(
      screen.getByTestId('linkai-primary-desktop-navigation').className
    ).toContain('left-1/2')
    expect(
      screen.getByTestId('linkai-primary-desktop-navigation').className
    ).not.toContain('justify-self-end')
    expect(screen.queryByTestId('linkai-console-desktop-actions')).toBeNull()
    expect(screen.queryByTestId('linkai-console-mobile-actions')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Open theme settings' })
    ).toBeNull()
  })

  it('can hide console search and theme while retaining the other console actions', () => {
    render(<LinkAiPublicHeader consoleMode showConsoleSearchAndTheme={false} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )

    const mobile = screen.getByTestId('linkai-console-mobile-actions')

    expect(screen.queryByTestId('linkai-console-desktop-actions')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Open theme settings' })
    ).toBeNull()
    expect(
      within(mobile).getByRole('button', { name: 'Language' })
    ).toBeTruthy()
    expect(
      within(mobile).getByRole('button', { name: 'Notifications' })
    ).toBeTruthy()
    expect(within(mobile).getByRole('button', { name: 'Profile' })).toBeTruthy()
  })

  it('keeps notification open state on only the surface that triggered it', () => {
    render(<LinkAiPublicHeader consoleMode />)

    const desktopNotification = within(
      screen.getByTestId('linkai-header-desktop-actions')
    ).getByRole('button', { name: 'Notifications' })
    const mobileNotification = within(
      screen.getByTestId('linkai-console-mobile-actions')
    ).getByRole('button', { name: 'Notifications', hidden: true })

    expect(desktopNotification).toHaveAttribute('aria-pressed', 'false')
    expect(mobileNotification).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(desktopNotification)

    expect(desktopNotification).toHaveAttribute('aria-pressed', 'true')
    expect(mobileNotification).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mobileNotification)

    expect(desktopNotification).toHaveAttribute('aria-pressed', 'false')
    expect(mobileNotification).toHaveAttribute('aria-pressed', 'true')
  })
})
