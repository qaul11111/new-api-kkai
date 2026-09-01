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

import type { TFunction } from 'i18next'
import { describe, test } from 'vitest'

import {
  DASHBOARD_DEFAULT_SECTION,
  DASHBOARD_SECTION_IDS,
  getDashboardSectionNavItems,
  isAdminOnlyDashboardSection,
} from './section-registry'

const t = ((key: string) => key) as TFunction

function navUrls(isAdmin: boolean): string[] {
  return getDashboardSectionNavItems(t, { isAdmin }).map((item) => item.url)
}

describe('dashboard section registry admin-only predicate', () => {
  test('flags exactly the sections declared adminOnly in the registry', () => {
    assert.equal(isAdminOnlyDashboardSection('users'), true)
    assert.equal(isAdminOnlyDashboardSection('overview'), false)
    assert.equal(isAdminOnlyDashboardSection('models'), false)
    assert.equal(isAdminOnlyDashboardSection('flow'), false)
    assert.equal(isAdminOnlyDashboardSection('not-a-section'), false)
  })

  test('keeps the default section reachable by every role', () => {
    // The unknown-section fallback redirects here; if it were admin-only,
    // non-admins would loop between the two guards.
    assert.equal(isAdminOnlyDashboardSection(DASHBOARD_DEFAULT_SECTION), false)
  })

  test('hides admin-only sections from non-admin nav items only', () => {
    const userUrls = navUrls(false)
    assert.deepEqual(userUrls, [
      '/dashboard/overview',
      '/dashboard/models',
      '/dashboard/flow',
    ])
    assert.equal(navUrls(true).length, DASHBOARD_SECTION_IDS.length)
    assert.ok(navUrls(true).includes('/dashboard/users'))
  })

  test('nav filtering and the guard predicate derive from one source', () => {
    // For every registered section, the nav filter must hide exactly the
    // sections the route guard will deny — a new `adminOnly: true` entry
    // automatically flips both sides of this assertion.
    const userUrls = navUrls(false)
    for (const id of DASHBOARD_SECTION_IDS) {
      assert.equal(
        userUrls.includes(`/dashboard/${id}`),
        !isAdminOnlyDashboardSection(id),
        `nav visibility disagrees with guard predicate for "${id}"`
      )
    }
  })
})
