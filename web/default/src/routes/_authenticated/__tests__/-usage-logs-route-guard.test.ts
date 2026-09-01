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

import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, test, vi } from 'vitest'

import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { Route as usageLogsSectionRoute } from '../usage-logs/$section'

// The page component chain is irrelevant to the route guard and pulls in
// browser-only asset packages that vitest cannot resolve.
vi.mock('@/features/linkai-console/usage-logs', () => ({
  LinkAiUsageLogs: () => null,
}))

type CapturedRedirect = {
  options: {
    to?: string
    params?: Record<string, string>
    search?: unknown
    replace?: boolean
  }
}

type GuardContext = {
  params: { section: string }
  search?: Record<string, unknown>
  status?: Record<string, unknown> | null
}

async function captureRedirect(
  context: GuardContext
): Promise<CapturedRedirect | null> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Seed the status cache so beforeLoad never touches the network.
  queryClient.setQueryData(['status'], context.status ?? null)
  const beforeLoad = usageLogsSectionRoute.options.beforeLoad as (args: {
    params: { section: string }
    search: Record<string, unknown>
    context: { queryClient: QueryClient }
  }) => unknown
  try {
    await beforeLoad({
      params: context.params,
      search: context.search ?? {},
      context: { queryClient },
    })
    return null
  } catch (err) {
    if (isRedirect(err)) return err as unknown as CapturedRedirect
    throw err
  }
}

function setUser(user: {
  role: number
  sidebar_modules?: string
  sidebarSettingsPermission?: boolean
}) {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'guard-test',
    role: user.role,
    sidebar_modules: user.sidebar_modules,
    permissions:
      user.sidebarSettingsPermission === undefined
        ? undefined
        : { sidebar_settings: user.sidebarSettingsPermission },
  })
}

const ALL_FLAGS_ON = { enable_drawing: true, enable_task: true }

describe('/usage-logs/$section access guard', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
    setUser({ role: ROLE.USER })
  })

  test('common logs stay reachable without any feature flags', async () => {
    assert.equal(
      await captureRedirect({ params: { section: 'common' }, status: {} }),
      null
    )
  })

  test('enabled drawing/task sections remain reachable', async () => {
    assert.equal(
      await captureRedirect({
        params: { section: 'drawing' },
        status: ALL_FLAGS_ON,
      }),
      null
    )
    assert.equal(
      await captureRedirect({
        params: { section: 'task' },
        status: ALL_FLAGS_ON,
      }),
      null
    )
  })

  test('redirects drawing to common when enable_drawing is off', async () => {
    const res = await captureRedirect({
      params: { section: 'drawing' },
      status: { enable_drawing: false, enable_task: true },
    })
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'common' })
    assert.equal(res?.options.replace, true)
  })

  test('redirects task to the default section when only enable_task is off', async () => {
    const res = await captureRedirect({
      params: { section: 'task' },
      status: { enable_drawing: true, enable_task: false },
    })
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'common' })
    assert.equal(res?.options.replace, true)
  })

  test('fails closed when the status payload is unavailable', async () => {
    const res = await captureRedirect({
      params: { section: 'drawing' },
      status: null,
    })
    assert.deepEqual(res?.options.params, { section: 'common' })
  })

  test('SidebarModulesAdmin overrides an enabled legacy flag', async () => {
    const res = await captureRedirect({
      params: { section: 'drawing' },
      status: {
        ...ALL_FLAGS_ON,
        SidebarModulesAdmin: JSON.stringify({
          console: { enabled: true, midjourney: false },
        }),
      },
    })
    assert.deepEqual(res?.options.params, { section: 'common' })
  })

  test('per-user sidebar_modules narrow an admin-enabled section', async () => {
    setUser({
      role: ROLE.USER,
      sidebar_modules: JSON.stringify({ console: { task: false } }),
    })
    const res = await captureRedirect({
      params: { section: 'task' },
      status: ALL_FLAGS_ON,
    })
    assert.deepEqual(res?.options.params, { section: 'common' })
    // An admin-sanctioned section stays reachable for the same user.
    assert.equal(
      await captureRedirect({
        params: { section: 'drawing' },
        status: ALL_FLAGS_ON,
      }),
      null
    )
  })

  test('ignores a stale user overlay when sidebar settings are not permitted', async () => {
    setUser({
      role: ROLE.SUPER_ADMIN,
      sidebar_modules: JSON.stringify({ console: { task: false } }),
      sidebarSettingsPermission: false,
    })
    assert.equal(
      await captureRedirect({
        params: { section: 'task' },
        status: ALL_FLAGS_ON,
      }),
      null
    )
  })

  test('redirects to /403 when every usage-log section is disabled', async () => {
    const res = await captureRedirect({
      params: { section: 'task' },
      status: {
        ...ALL_FLAGS_ON,
        SidebarModulesAdmin: JSON.stringify({
          console: { enabled: false },
        }),
      },
    })
    assert.equal(res?.options.to, '/403')
  })

  test('still redirects unknown sections to the default section', async () => {
    const res = await captureRedirect({
      params: { section: 'bogus' },
      status: ALL_FLAGS_ON,
    })
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'common' })
  })

  test('keeps stripping the common-only type filter from other sections', async () => {
    const res = await captureRedirect({
      params: { section: 'task' },
      search: { type: ['1', '2'], model: 'gpt-4o' },
      status: ALL_FLAGS_ON,
    })
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'task' })
    const search = res?.options.search as Record<string, unknown> | undefined
    assert.equal(search?.type, undefined)
    assert.equal(search?.model, 'gpt-4o')
  })
})
