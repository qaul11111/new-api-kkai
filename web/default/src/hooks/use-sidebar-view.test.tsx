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
import assert from 'node:assert/strict'

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, test, vi } from 'vitest'

import type { NavGroup } from '@/components/layout/types'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { useSidebarView } from './use-sidebar-view'

const { locationHolder, sidebarDataHolder, statusHolder } = vi.hoisted(() => ({
  locationHolder: { current: { pathname: '/dashboard/overview' } },
  sidebarDataHolder: { current: { navGroups: [] as NavGroup[] } },
  statusHolder: { current: null as Record<string, unknown> | null },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useLocation: (opts?: { select?: (l: { pathname: string }) => string }) =>
      opts?.select
        ? opts.select(locationHolder.current)
        : locationHolder.current,
  }
})

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: statusHolder.current,
    loading: false,
    error: null,
  }),
}))

// useSidebarData owns the sidebar_modules/feature-flag narrowing; these
// tests observe what useSidebarView adds on top of that already-filtered
// data, so the data layer is stubbed with fixed groups.
vi.mock('@/hooks/use-sidebar-data', () => ({
  useSidebarData: () => sidebarDataHolder.current,
}))

function makeNavGroups(): NavGroup[] {
  return [
    {
      id: 'general',
      title: 'General',
      items: [
        // Deliberately a URL the admin sidebar_modules config below
        // disables: a second useSidebarConfig pass here would drop it.
        { title: 'Overview', url: '/dashboard/overview' },
        {
          title: 'System Info',
          url: '/system-info',
          requiredRole: ROLE.SUPER_ADMIN,
        },
      ],
    },
    {
      id: 'admin',
      title: 'Admin',
      items: [{ title: 'Users', url: '/users' }],
    },
  ]
}

function groupIds(
  view: ReturnType<typeof useSidebarView>
): (string | undefined)[] {
  return view.navGroups.map((group) => group.id)
}

describe('useSidebarView', () => {
  beforeEach(() => {
    locationHolder.current = { pathname: '/dashboard/overview' }
    sidebarDataHolder.current = { navGroups: makeNavGroups() }
    // Admin config with the console "detail" module disabled — visible only
    // if useSidebarView wrongly re-applies useSidebarConfig.
    statusHolder.current = {
      SidebarModulesAdmin: JSON.stringify({
        console: { enabled: true, detail: false },
      }),
    }
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'sidebar-view-test',
      role: ROLE.USER,
    })
  })

  test('does not re-apply sidebar_modules config to useSidebarData output', () => {
    const { result } = renderHook(() => useSidebarView())
    const general = result.current.navGroups.find((g) => g.id === 'general')
    const urls = (general?.items ?? []).map((item) =>
      'url' in item ? item.url : undefined
    )
    assert.ok(urls.includes('/dashboard/overview'))
  })

  test('drops the admin group and role-gated items for ordinary users', () => {
    const { result } = renderHook(() => useSidebarView())
    assert.equal(result.current.view, null)
    assert.deepEqual(groupIds(result.current), ['general'])
    const general = result.current.navGroups[0]
    assert.deepEqual(
      general.items.map((item) => ('url' in item ? item.url : undefined)),
      ['/dashboard/overview']
    )
  })

  test('keeps the admin group and filters items by requiredRole for admins', () => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'sidebar-view-admin',
      role: ROLE.ADMIN,
    })
    const { result } = renderHook(() => useSidebarView())
    assert.deepEqual(groupIds(result.current), ['general', 'admin'])
    const general = result.current.navGroups[0]
    assert.deepEqual(
      general.items.map((item) => ('url' in item ? item.url : undefined)),
      ['/dashboard/overview']
    )
  })

  test('returns the nested view untouched for drill-in workspaces', () => {
    locationHolder.current = { pathname: '/system-settings/site' }
    const { result } = renderHook(() => useSidebarView())
    assert.equal(result.current.view?.id, 'system-settings')
    assert.equal(result.current.key, 'system-settings')
    assert.ok(result.current.navGroups.length > 0)
  })
})
