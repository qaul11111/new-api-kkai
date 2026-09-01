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
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LinkAiConsoleLayout } from './console-layout'

const authState = vi.hoisted(() => ({ role: 1 }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/page-transition', () => ({
  AnimatedOutlet: () => <div>Outlet</div>,
}))

vi.mock('@/components/skip-to-main', () => ({
  SkipToMain: () => null,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { auth: { user: { role: number } } }) => unknown
  ) => selector({ auth: { user: { role: authState.role } } }),
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children, ...props }: React.ComponentProps<'div'>) => (
    <div data-testid='sidebar-provider' {...props}>
      {children}
    </div>
  ),
  SidebarInset: ({ children, ...props }: React.ComponentProps<'main'>) => (
    <main data-testid='sidebar-inset' {...props}>
      {children}
    </main>
  ),
  SidebarTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type='button'>{children}</button>
  ),
}))

vi.mock('@/features/linkai-public/components/public-header', async () => {
  const { useLayout } = await import('@/context/layout-provider')
  return {
    LinkAiPublicHeader: (props: {
      consoleMode?: boolean
      showConsoleSearchAndTheme?: boolean
    }) => {
      useLayout()
      return (
        <header
          data-console-mode={String(props.consoleMode)}
          data-search-theme={String(props.showConsoleSearchAndTheme)}
        >
          Console header
        </header>
      )
    },
  }
})

vi.mock('./components/console-sidebar', () => ({
  ConsoleSidebar: () => <aside>Sidebar</aside>,
}))

describe('LinkAiConsoleLayout', () => {
  beforeEach(() => {
    authState.role = 1
  })

  it('mounts the console header under the LayoutProvider required by ConfigDrawer', () => {
    render(<LinkAiConsoleLayout />)

    const header = screen.getByText('Console header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveAttribute('data-console-mode', 'true')
    expect(header).toHaveAttribute('data-search-theme', 'false')
    expect(screen.getByText('Outlet')).toBeInTheDocument()
  })

  it('locks the console shell to the viewport and delegates scrolling to route content', () => {
    render(<LinkAiConsoleLayout />)

    const provider = screen.getByTestId('sidebar-provider')
    const shellBody = screen.getByTestId('linkai-console-shell-body')
    const inset = screen.getByTestId('sidebar-inset')
    const mainContent = document.querySelector('#main-content')

    expect(provider.className).toContain('h-svh')
    expect(provider.className).toContain('max-h-svh')
    expect(provider.className).toContain('overflow-hidden')
    expect(provider.style.getPropertyValue('--app-header-height')).toBe('80px')
    expect(provider.style.getPropertyValue('--sidebar-width-icon')).toBe(
      '3.25rem'
    )
    expect(provider.className).toContain('linkai-user-console-shell')
    expect(shellBody.className).toContain('overflow-hidden')
    expect(inset.className).toContain('h-full')
    expect(inset.className).toContain('overflow-hidden')
    expect(mainContent?.className).toContain('overflow-hidden')
  })

  it('does not apply ordinary-user theme overrides to administrator sessions', () => {
    authState.role = 10

    render(<LinkAiConsoleLayout />)

    expect(screen.getByTestId('sidebar-provider').className).not.toContain(
      'linkai-user-console-shell'
    )
  })
})
