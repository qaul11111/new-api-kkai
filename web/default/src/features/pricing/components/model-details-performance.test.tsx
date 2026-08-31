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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { getPerfMetrics } from '@/features/performance-metrics/api'
import type { PerformanceMetricsData } from '@/features/performance-metrics/types'

import type { PricingModel } from '../types'
import { ModelDetailsPerformance } from './model-details-performance'

vi.mock('@/features/performance-metrics/api', () => ({
  getPerfMetrics: vi.fn(),
}))

// VChart needs a canvas that jsdom does not provide; the charts are pure
// renderers of the real series, so they are stubbed here. The sparkline and
// table under test stay real.
vi.mock('./model-details-charts', () => ({
  LatencyTrendChart: () => <div data-testid='latency-trend-chart' />,
  UptimeTrendChart: () => <div data-testid='uptime-trend-chart' />,
}))

const MODEL: PricingModel = {
  id: 1,
  model_name: 'gpt-4o-mini',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 2,
  enable_groups: ['default'],
}

const REAL_METRICS: PerformanceMetricsData = {
  success: true,
  data: {
    model_name: 'gpt-4o-mini',
    groups: [
      {
        group: 'default',
        avg_ttft_ms: 420,
        avg_latency_ms: 900,
        success_rate: 99.9,
        avg_tps: 83.5,
        series: [
          {
            ts: 1_725_000_000,
            avg_ttft_ms: 420,
            avg_latency_ms: 900,
            success_rate: 99.5,
            avg_tps: 80,
          },
        ],
      },
    ],
  },
}

function renderPerformance(queryFn: () => Promise<PerformanceMetricsData>) {
  vi.mocked(getPerfMetrics).mockImplementation(queryFn)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ModelDetailsPerformance model={MODEL} />
    </QueryClientProvider>
  )
}

describe('ModelDetailsPerformance', () => {
  test('renders a truthful loading state while metrics are loading', () => {
    renderPerformance(() => new Promise(() => {}))

    expect(screen.getByText('Loading availability data...')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Performance data is not yet available for this model.'
      )
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Per-group performance')).not.toBeInTheDocument()
  })

  test('renders the unavailable state for a successful empty result', async () => {
    renderPerformance(() =>
      Promise.resolve({
        success: true,
        data: { model_name: 'gpt-4o-mini', groups: [] },
      })
    )

    expect(
      await screen.findByText(
        'Performance data is not yet available for this model.'
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Loading availability data...')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Per-group performance')).not.toBeInTheDocument()
  })

  test('renders real performance-metrics API content', async () => {
    renderPerformance(() => Promise.resolve(REAL_METRICS))

    expect(await screen.findByText('Per-group performance')).toBeInTheDocument()
    expect(getPerfMetrics).toHaveBeenCalledWith('gpt-4o-mini', 24)
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('Latency trend (last 24h)')).toBeInTheDocument()
    expect(screen.getByText('Availability (last 24h)')).toBeInTheDocument()
    expect(screen.getByTestId('latency-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('uptime-trend-chart')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Performance data is not yet available for this model.'
      )
    ).not.toBeInTheDocument()
  })

  test('does not present inferred incident or outage claims', async () => {
    renderPerformance(() => Promise.resolve(REAL_METRICS))

    expect(await screen.findByText('Per-group performance')).toBeInTheDocument()
    expect(screen.queryByText(/incident/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/outage/i)).not.toBeInTheDocument()
    expect(
      screen.getAllByText('Request success rate sampled over the last 24 hours')
        .length
    ).toBeGreaterThan(0)
  })
})
