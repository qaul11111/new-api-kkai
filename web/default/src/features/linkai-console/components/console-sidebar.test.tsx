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
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsoleSidebar } from './console-sidebar'

const sidebar = vi.hoisted(() => ({
  setOpenMobile: vi.fn(),
  toggleSidebar: vi.fn(),
  state: 'expanded' as 'expanded' | 'collapsed',
}))

const auth = vi.hoisted(() => ({ role: 1 }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.ComponentProps<'a'> & { to: string }) =>
    React.createElement('a', { ...props, href: to }, children),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/layout', () => ({
  NavGroup: () => <div>Navigation group</div>,
}))

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <footer>{children}</footer>
  ),
  useSidebar: () => ({
    state: sidebar.state,
    setOpenMobile: sidebar.setOpenMobile,
    toggleSidebar: sidebar.toggleSidebar,
  }),
}))

vi.mock('@/hooks/use-sidebar-view', () => ({
  useSidebarView: () => ({
    key: 'root',
    navGroups: [{ id: 'personal', title: 'Personal', items: [] }],
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { auth: { user: { role: number } } }) => unknown
  ) => selector({ auth: { user: { role: auth.role } } }),
}))

describe('ConsoleSidebar mobile navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sidebar.state = 'expanded'
    auth.role = 1
  })

  it('removes the decorative C-end and B-end entries for ordinary users', () => {
    render(<ConsoleSidebar />)

    expect(screen.queryByText('C-end Menu')).toBeNull()
    expect(screen.queryByText('B-end Menu')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
  })

  it('does not show the admin entry to an administrator', () => {
    auth.role = 10

    render(<ConsoleSidebar />)

    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
  })

  it('shows one admin entry to a super administrator and keeps the B-end destination', () => {
    auth.role = 100
    sidebar.state = 'collapsed'

    render(<ConsoleSidebar />)

    const adminLink = screen.getByRole('link', { name: 'Admin' })

    expect(adminLink).toHaveAttribute('href', '/subscriptions')

    fireEvent.click(adminLink)

    expect(sidebar.setOpenMobile).toHaveBeenCalledWith(false)
  })
})
