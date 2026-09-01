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
import {
  USAGE_LOGS_DEFAULT_SECTION,
  USAGE_LOGS_SECTION_IDS,
  type UsageLogsSectionId,
} from '../section-registry'

/**
 * Canonical URL for each usage-logs section. Kept here so route guards and
 * sidebar module checks cannot drift apart.
 */
export const USAGE_LOGS_SECTION_URLS: Record<UsageLogsSectionId, string> = {
  common: '/usage-logs/common',
  drawing: '/usage-logs/drawing',
  task: '/usage-logs/task',
}

/**
 * Legacy system feature flags from `/api/status` that gate the drawing and
 * task log sections (`enable_drawing` / `enable_task` in the classic UI).
 */
export type UsageLogsFeatureFlags = {
  enableDrawing: boolean
  enableTask: boolean
}

/**
 * Resolve the legacy flags from a `/api/status` payload. Anything that is not
 * an explicit boolean `true` counts as disabled, matching the classic UI
 * where the sections stay hidden until the flag reads `'true'`.
 */
export function resolveUsageLogsFeatureFlags(
  status: Record<string, unknown> | null | undefined
): UsageLogsFeatureFlags {
  return {
    enableDrawing: status?.enable_drawing === true,
    enableTask: status?.enable_task === true,
  }
}

/**
 * A usage-logs section is reachable only when its legacy feature flag (if
 * any) is on AND the sidebar module config allows its URL. Both navigation
 * and the route-level guard must use this exact combination.
 */
export function isUsageLogsSectionAccessible(
  section: UsageLogsSectionId,
  flags: UsageLogsFeatureFlags,
  isModuleVisible: (url: string) => boolean
): boolean {
  if (section === 'drawing' && !flags.enableDrawing) return false
  if (section === 'task' && !flags.enableTask) return false
  return isModuleVisible(USAGE_LOGS_SECTION_URLS[section])
}

/**
 * First accessible section in registry order, with the default section
 * preferred. Returns null when the whole usage-logs area is disabled.
 */
export function findAccessibleUsageLogsSection(
  flags: UsageLogsFeatureFlags,
  isModuleVisible: (url: string) => boolean
): UsageLogsSectionId | null {
  const ordered: UsageLogsSectionId[] = [
    USAGE_LOGS_DEFAULT_SECTION,
    ...USAGE_LOGS_SECTION_IDS.filter((id) => id !== USAGE_LOGS_DEFAULT_SECTION),
  ]
  for (const section of ordered) {
    if (isUsageLogsSectionAccessible(section, flags, isModuleVisible)) {
      return section
    }
  }
  return null
}
