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

import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, test, vi } from 'vitest'

import {
  DASHBOARD_SECTION_IDS,
  isAdminOnlyDashboardSection,
} from '@/features/dashboard/section-registry'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { Route as dashboardSectionRoute } from '../dashboard/$section'

// The route guard does not need to load the dashboard's visual dependency
// graph (including browser-only icon packages) during Vitest.
vi.mock('@/features/linkai-console/dashboard', () => ({
  LinkAiDashboard: () => null,
}))

type CapturedRedirect = {
  options: { to?: string; params?: Record<string, string> }
}

async function captureRedirect(
  section: string
): Promise<CapturedRedirect | null> {
  const beforeLoad = dashboardSectionRoute.options.beforeLoad as (args: {
    params: { section: string }
  }) => unknown
  try {
    await beforeLoad({ params: { section } })
    return null
  } catch (err) {
    if (isRedirect(err)) return err as unknown as CapturedRedirect
    throw err
  }
}

function setUserRole(role: number) {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'guard-test',
    role,
  })
}

describe('/dashboard/$section access guard', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  test('redirects an ordinary user away from the users section before mount', async () => {
    setUserRole(ROLE.USER)
    const res = await captureRedirect('users')
    assert.equal(res?.options.to, '/403')
  })

  test('redirects when there is no signed-in user at all', async () => {
    const res = await captureRedirect('users')
    assert.equal(res?.options.to, '/403')
  })

  test('lets admins and root through to the users section', async () => {
    setUserRole(ROLE.ADMIN)
    assert.equal(await captureRedirect('users'), null)
    setUserRole(ROLE.SUPER_ADMIN)
    assert.equal(await captureRedirect('users'), null)
  })

  test('keeps non-admin sections open to ordinary users', async () => {
    setUserRole(ROLE.USER)
    assert.equal(await captureRedirect('overview'), null)
    assert.equal(await captureRedirect('models'), null)
    assert.equal(await captureRedirect('flow'), null)
  })

  test('drives the whole role matrix from the registry predicate', async () => {
    // The guard consumes `isAdminOnlyDashboardSection`, so iterating the
    // registry here proves that any future `adminOnly: true` section is
    // denied to non-admins without touching this guard.
    setUserRole(ROLE.USER)
    for (const section of DASHBOARD_SECTION_IDS) {
      const res = await captureRedirect(section)
      if (isAdminOnlyDashboardSection(section)) {
        assert.equal(res?.options.to, '/403', `expected /403 for "${section}"`)
      } else {
        assert.equal(res, null, `expected "${section}" to stay open`)
      }
    }
    setUserRole(ROLE.ADMIN)
    for (const section of DASHBOARD_SECTION_IDS) {
      assert.equal(await captureRedirect(section), null)
    }
  })

  test('still redirects unknown sections to the default section', async () => {
    setUserRole(ROLE.SUPER_ADMIN)
    const res = await captureRedirect('not-a-section')
    assert.equal(res?.options.to, '/dashboard/$section')
    assert.deepEqual(res?.options.params, { section: 'overview' })
  })
})
