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

import {
  createSidebarModuleVisibility,
  useIsSidebarModuleVisible,
  useSidebarConfig,
} from './use-sidebar-config'

const { statusHolder } = vi.hoisted(() => ({
  statusHolder: { current: null as Record<string, unknown> | null },
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: statusHolder.current,
    loading: false,
    error: null,
  }),
}))

const TASK_LOGS_ITEM = {
  title: 'Task Logs',
  url: '/usage-logs/task',
  activeUrls: ['/usage-logs/drawing'],
  configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
}

function makeNavGroups(): NavGroup[] {
  return [
    {
      id: 'general',
      title: 'General',
      items: [
        { title: 'Usage Logs', url: '/usage-logs/common' },
        { ...TASK_LOGS_ITEM },
      ],
    },
  ]
}

function setUser(user?: {
  role?: number
  sidebar_modules?: string
  sidebarSettingsPermission?: boolean
}) {
  useAuthStore.getState().auth.reset()
  if (!user) return
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'sidebar-test',
    role: user.role ?? ROLE.USER,
    sidebar_modules: user.sidebar_modules,
    permissions:
      user.sidebarSettingsPermission === undefined
        ? undefined
        : { sidebar_settings: user.sidebarSettingsPermission },
  })
}

function groupItemUrls(groups: NavGroup[]): string[] {
  return groups
    .flatMap((group) =>
      group.items.map((item) => ('url' in item ? item.url : undefined))
    )
    .filter((url): url is string => Boolean(url))
}

describe('createSidebarModuleVisibility', () => {
  beforeEach(() => {
    statusHolder.current = null
  })

  test('gates drawing/task URLs on the legacy enable flags', () => {
    const visible = createSidebarModuleVisibility({
      status: { enable_drawing: true, enable_task: false },
    })
    assert.equal(visible('/usage-logs/common'), true)
    assert.equal(visible('/usage-logs/drawing'), true)
    assert.equal(visible('/usage-logs/task'), false)
  })

  test('combines flags with the admin sidebar module config', () => {
    const visible = createSidebarModuleVisibility({
      status: { enable_drawing: true, enable_task: true },
      sidebarModulesAdmin: JSON.stringify({
        console: { enabled: true, midjourney: false },
      }),
    })
    assert.equal(visible('/usage-logs/drawing'), false)
    assert.equal(visible('/usage-logs/task'), true)
  })

  test('lets the per-user config narrow but not widen admin config', () => {
    const narrowed = createSidebarModuleVisibility({
      status: { enable_drawing: true, enable_task: true },
      userSidebarModules: JSON.stringify({ console: { task: false } }),
    })
    assert.equal(narrowed('/usage-logs/task'), false)
    assert.equal(narrowed('/usage-logs/drawing'), true)

    const cannotWiden = createSidebarModuleVisibility({
      status: { enable_drawing: true, enable_task: true },
      sidebarModulesAdmin: JSON.stringify({
        console: { enabled: true, task: false },
      }),
      userSidebarModules: JSON.stringify({ console: { task: true } }),
    })
    assert.equal(cannotWiden('/usage-logs/task'), false)
  })

  test('skips the user overlay when sidebar settings are not permitted', () => {
    const visible = createSidebarModuleVisibility({
      status: { enable_drawing: true, enable_task: true },
      userSidebarModules: JSON.stringify({ console: { task: false } }),
      sidebarSettingsPermission: false,
    })
    assert.equal(visible('/usage-logs/task'), true)
  })

  test('hides drawing/task when the status payload is missing', () => {
    const visible = createSidebarModuleVisibility({ status: null })
    assert.equal(visible('/usage-logs/drawing'), false)
    assert.equal(visible('/usage-logs/task'), false)
    assert.equal(visible('/usage-logs/common'), true)
  })
})

describe('useSidebarConfig', () => {
  beforeEach(() => {
    statusHolder.current = null
    setUser()
  })

  test('hides the task log nav entry when both legacy flags are off', () => {
    statusHolder.current = { enable_drawing: false, enable_task: false }
    const { result } = renderHook(() => useSidebarConfig(makeNavGroups()))
    assert.deepEqual(groupItemUrls(result.current), ['/usage-logs/common'])
  })

  test('keeps the task log nav entry while any covered section is enabled', () => {
    statusHolder.current = { enable_drawing: true, enable_task: false }
    const { result } = renderHook(() => useSidebarConfig(makeNavGroups()))
    assert.ok(groupItemUrls(result.current).includes('/usage-logs/task'))
  })

  test('drops the whole nav group when the admin disables the console section', () => {
    statusHolder.current = {
      enable_drawing: true,
      enable_task: true,
      SidebarModulesAdmin: JSON.stringify({ console: { enabled: false } }),
    }
    const { result } = renderHook(() => useSidebarConfig(makeNavGroups()))
    assert.deepEqual(result.current, [])
  })
})

describe('useIsSidebarModuleVisible', () => {
  beforeEach(() => {
    statusHolder.current = null
    setUser()
  })

  test('reflects the legacy flag for direct visibility probes', () => {
    statusHolder.current = { enable_drawing: true }
    assert.equal(
      renderHook(() => useIsSidebarModuleVisible('/usage-logs/drawing')).result
        .current,
      true
    )
    assert.equal(
      renderHook(() => useIsSidebarModuleVisible('/usage-logs/task')).result
        .current,
      false
    )
  })
})
