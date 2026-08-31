/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AnnouncementsPanel } from './components/announcements-panel'
import { ModelUsagePanel } from './components/model-usage-panel'
import { SummaryCard } from './components/summary-cards'
import { LinkAiDashboard } from './index'
import { buildUsageRows } from './lib/model-usage'
import { isLinkAiOverviewSection } from './lib/section'

const routeState = vi.hoisted(() => ({ section: 'overview' }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { data: [] },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ section: routeState.section }),
  }),
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: React.ReactNode
    params?: { section?: string }
    to: string
  }) => (
    <a href={to.replace('$section', params?.section ?? '')} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/features/dashboard', () => ({
  Dashboard: () => <div data-testid='target-dashboard'>target dashboard</div>,
}))

vi.mock('@/features/dashboard/hooks/use-status-data', () => ({
  useAnnouncements: () => ({ items: [], loading: false }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: {
      auth: {
        user: {
          display_name: string
          group: string
          id: number
          quota: number
          request_count: number
          role: number
          used_quota: number
        }
      }
    }) => unknown
  ) =>
    selector({
      auth: {
        user: {
          display_name: 'Kai',
          group: 'default',
          id: 7,
          quota: 100,
          request_count: 3,
          role: 1,
          used_quota: 25,
        },
      },
    }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values
        ? key.replaceAll(
            /\{\{(\w+)\}\}/g,
            (_, name) => values[name] ?? `{{${name}}}`
          )
        : key,
  }),
}))

vi.mock(
  '@/features/dashboard/components/overview/announcement-detail-dialog',
  () => ({
    AnnouncementDetailModal: ({
      announcement,
    }: {
      announcement: { content: string } | null
    }) => <div data-testid='announcement-detail'>{announcement?.content}</div>,
  })
)

describe('LinkAI dashboard overview adapter', () => {
  it('uses LinkAI only for the overview section', () => {
    expect(isLinkAiOverviewSection('overview')).toBe(true)
    expect(isLinkAiOverviewSection('models')).toBe(false)
    expect(isLinkAiOverviewSection('flow')).toBe(false)
    expect(isLinkAiOverviewSection('users')).toBe(false)
  })

  it('renders the LinkAI overview and delegates other sections to Dashboard', () => {
    routeState.section = 'overview'
    const { rerender } = render(<LinkAiDashboard />)
    expect(screen.getByText('Welcome home, Kai')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByTestId('target-dashboard')).not.toBeInTheDocument()

    routeState.section = 'models'
    rerender(<LinkAiDashboard />)
    expect(screen.getByTestId('target-dashboard')).toBeInTheDocument()
    routeState.section = 'overview'
  })

  it('routes summary actions to wallet and common usage logs', () => {
    render(
      <>
        <SummaryCard
          title='Balance'
          value='$10'
          description='Available'
          icon='balance'
          action={{ label: 'Recharge', to: '/wallet' }}
        />
        <SummaryCard
          title='Usage'
          value='$2'
          description='Consumed'
          icon='consumption'
          action={{ label: 'Logs', to: '/usage-logs/$section' }}
        />
      </>
    )

    expect(screen.getByRole('link', { name: 'Recharge' })).toHaveAttribute(
      'href',
      '/wallet'
    )
    expect(screen.getByRole('link', { name: 'Logs' })).toHaveAttribute(
      'href',
      '/usage-logs/common'
    )
  })

  it('aggregates usage by model and ranks the selected metric', () => {
    expect(
      buildUsageRows(
        [
          { created_at: 1, model_name: 'alpha', quota: 10, count: 2 },
          { created_at: 2, model_name: 'beta', quota: 30, count: 1 },
          { created_at: 3, model_name: 'alpha', quota: 20, count: 4 },
        ],
        'requests'
      )
    ).toMatchObject([
      { label: 'alpha', quota: 30, requests: 6 },
      { label: 'beta', quota: 30, requests: 1 },
    ])
  })

  it('shows usage empty and error/retry states', () => {
    const onRefresh = vi.fn()
    const { rerender } = render(
      <ModelUsagePanel
        data={[]}
        error={false}
        interval='day'
        loading={false}
        onIntervalChange={vi.fn()}
        onRefresh={onRefresh}
        refreshing={false}
      />
    )
    expect(screen.getByText('No usage data yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      screen.getByRole('button', { name: 'Consumption ratio' })
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Call ratio' }))
    expect(screen.getByRole('button', { name: 'Call ratio' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    rerender(
      <ModelUsagePanel
        data={[]}
        error
        interval='day'
        loading={false}
        onIntervalChange={vi.fn()}
        onRefresh={onRefresh}
        refreshing={false}
      />
    )
    fireEvent.click(screen.getByText('Retry'))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('filters pricing announcements and opens their detail', () => {
    render(
      <AnnouncementsPanel
        loading={false}
        items={[
          {
            id: 1,
            content: 'System maintenance this weekend',
            publishDate: '2026-08-31',
          },
          {
            id: 2,
            content: 'Pricing change for premium models',
            publishDate: '2026-08-30',
          },
        ]}
      />
    )

    fireEvent.click(screen.getByText('Pricing notice'))
    expect(screen.getByText('Pricing notice')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    fireEvent.click(screen.getByText('Pricing change for premium models'))
    expect(screen.getByTestId('announcement-detail')).toHaveTextContent(
      'Pricing change for premium models'
    )
  })
})
