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

import { describe, test } from 'vitest'

import {
  findAccessibleUsageLogsSection,
  isUsageLogsSectionAccessible,
  resolveUsageLogsFeatureFlags,
  USAGE_LOGS_SECTION_URLS,
} from './section-access'

const ALL_VISIBLE = () => true

describe('resolveUsageLogsFeatureFlags', () => {
  test('reads the legacy enable_drawing/enable_task booleans from /api/status', () => {
    assert.deepEqual(
      resolveUsageLogsFeatureFlags({
        enable_drawing: true,
        enable_task: true,
      }),
      { enableDrawing: true, enableTask: true }
    )
  })

  test('treats missing, false, or non-boolean flags as disabled', () => {
    assert.deepEqual(resolveUsageLogsFeatureFlags(null), {
      enableDrawing: false,
      enableTask: false,
    })
    assert.deepEqual(resolveUsageLogsFeatureFlags(undefined), {
      enableDrawing: false,
      enableTask: false,
    })
    assert.deepEqual(
      resolveUsageLogsFeatureFlags({
        enable_drawing: false,
        enable_task: 'true',
      }),
      { enableDrawing: false, enableTask: false }
    )
  })
})

describe('isUsageLogsSectionAccessible', () => {
  test('common logs only require the sidebar module to be visible', () => {
    const flags = { enableDrawing: false, enableTask: false }
    assert.equal(
      isUsageLogsSectionAccessible('common', flags, ALL_VISIBLE),
      true
    )
    assert.equal(
      isUsageLogsSectionAccessible('common', flags, () => false),
      false
    )
  })

  test('drawing logs require enable_drawing in addition to the module config', () => {
    const disabled = { enableDrawing: false, enableTask: true }
    const enabled = { enableDrawing: true, enableTask: false }
    assert.equal(
      isUsageLogsSectionAccessible('drawing', disabled, ALL_VISIBLE),
      false
    )
    assert.equal(
      isUsageLogsSectionAccessible('drawing', enabled, ALL_VISIBLE),
      true
    )
    // Flag on but module hidden by sidebar config -> still blocked.
    assert.equal(
      isUsageLogsSectionAccessible(
        'drawing',
        enabled,
        (url) => url !== USAGE_LOGS_SECTION_URLS.drawing
      ),
      false
    )
  })

  test('task logs require enable_task in addition to the module config', () => {
    const disabled = { enableDrawing: true, enableTask: false }
    const enabled = { enableDrawing: false, enableTask: true }
    assert.equal(
      isUsageLogsSectionAccessible('task', disabled, ALL_VISIBLE),
      false
    )
    assert.equal(
      isUsageLogsSectionAccessible('task', enabled, ALL_VISIBLE),
      true
    )
    assert.equal(
      isUsageLogsSectionAccessible('task', enabled, () => false),
      false
    )
  })
})

describe('findAccessibleUsageLogsSection', () => {
  test('prefers the default common section when everything is enabled', () => {
    const flags = { enableDrawing: true, enableTask: true }
    assert.equal(findAccessibleUsageLogsSection(flags, ALL_VISIBLE), 'common')
  })

  test('falls back to the first flag-enabled section when common is hidden', () => {
    const flags = { enableDrawing: true, enableTask: true }
    const withoutCommon = (url: string) =>
      url !== USAGE_LOGS_SECTION_URLS.common
    assert.equal(
      findAccessibleUsageLogsSection(flags, withoutCommon),
      'drawing'
    )
  })

  test('skips sections whose legacy flag is disabled', () => {
    const flags = { enableDrawing: false, enableTask: true }
    const withoutCommon = (url: string) =>
      url !== USAGE_LOGS_SECTION_URLS.common
    assert.equal(findAccessibleUsageLogsSection(flags, withoutCommon), 'task')
  })

  test('returns null when no section may be shown', () => {
    const flags = { enableDrawing: true, enableTask: true }
    assert.equal(
      findAccessibleUsageLogsSection(flags, () => false),
      null
    )
  })

  test('keeps common reachable when only the legacy flags are off', () => {
    const flags = { enableDrawing: false, enableTask: false }
    const onlyCommon = (url: string) => url === USAGE_LOGS_SECTION_URLS.common
    assert.equal(findAccessibleUsageLogsSection(flags, onlyCommon), 'common')
  })
})
