/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import type { QuotaDataItem } from '@/features/dashboard/types'

export type UsageInterval = 'day' | 'hour'
export type UsageMetric = 'quota' | 'requests' | 'tokens'

export type UsageRow = {
  label: string
  quota: number
  requests: number
  tokens: number
}

export function buildUsageRows(data: QuotaDataItem[], metric: UsageMetric) {
  const rows = new Map<string, UsageRow>()

  for (const item of data) {
    const label = item.model_name?.trim() || 'Other'
    const current = rows.get(label) ?? {
      label,
      quota: 0,
      requests: 0,
      tokens: 0,
    }
    current.quota += Number(item.quota) || 0
    current.requests += Number(item.count) || 0
    current.tokens += Number(item.token_used) || 0
    rows.set(label, current)
  }

  return [...rows.values()]
    .sort((left, right) => right[metric] - left[metric])
    .slice(0, 7)
}
