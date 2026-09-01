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
import { describe, expect, test } from 'vitest'

import type { UptimeDayPoint } from '../lib/performance-series'
import { UptimeSparkline } from './model-details-uptime-sparkline'

const SERIES: UptimeDayPoint[] = [
  {
    date: '2026-08-30T12:00:00.000Z',
    uptime_pct: 100,
  },
  {
    date: '2026-08-30T13:00:00.000Z',
    uptime_pct: 98,
  },
]

describe('UptimeSparkline', () => {
  test('uses a neutral accessible label without a hard-coded window', () => {
    render(<UptimeSparkline series={SERIES} />)

    const chart = screen.getByRole('img')
    expect(chart).toHaveAttribute('aria-label', 'Uptime 99.00%')
    expect(chart.getAttribute('aria-label')).not.toContain('30 day')
  })

  test('renders the fallback label for an empty series', () => {
    render(<UptimeSparkline series={[]} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
