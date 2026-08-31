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
import { describe, expect, test, vi } from 'vitest'

import type { UptimeDayPoint } from '../lib/performance-series'
import { UptimeTrendChart } from './model-details-charts'

// VChart needs a canvas that jsdom does not provide; capture the spec the
// component builds so the test can assert on the chart contract directly.
const { capturedSpecs } = vi.hoisted(() => ({
  capturedSpecs: [] as Record<string, unknown>[],
}))

vi.mock('@visactor/react-vchart', () => ({
  VChart: (props: { spec: Record<string, unknown> }) => {
    capturedSpecs.push(props.spec)
    return <div data-testid='vchart' />
  },
}))

vi.mock('@/lib/use-chart-theme', () => ({
  useChartTheme: () => ({ resolvedTheme: 'light', themeReady: true }),
}))

const SERIES: UptimeDayPoint[] = [
  { date: '2026-08-30T12:00:00.000Z', uptime_pct: 100 },
  { date: '2026-08-30T13:00:00.000Z', uptime_pct: 98.5 },
]

describe('UptimeTrendChart', () => {
  test('renders an empty state when there is no uptime data', () => {
    render(<UptimeTrendChart series={[]} />)

    expect(screen.getByText('No uptime data available')).toBeInTheDocument()
    expect(screen.queryByTestId('vchart')).not.toBeInTheDocument()
  })

  test('builds a spec with only real uptime fields and no incident or outage claims', () => {
    capturedSpecs.length = 0
    render(<UptimeTrendChart series={SERIES} />)

    expect(capturedSpecs).toHaveLength(1)
    const spec = capturedSpecs[0]

    const data = spec.data as { values: Record<string, unknown>[] }[]
    expect(data[0].values).toHaveLength(2)
    for (const value of data[0].values) {
      expect(Object.keys(value).sort()).toEqual(['date', 'uptime'])
    }

    const tooltip = spec.tooltip as {
      mark: { content: { key: string }[] }
    }
    expect(tooltip.mark.content.map((row) => row.key)).toEqual(['Uptime'])

    const serialized = JSON.stringify(spec)
    expect(serialized).not.toMatch(/incident/i)
    expect(serialized).not.toMatch(/outage/i)
  })
})
