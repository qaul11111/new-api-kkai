/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dashboard } from '@/features/dashboard'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useAnnouncements } from '@/features/dashboard/hooks/use-status-data'
import { formatCompactNumber, formatNumber, formatQuota } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

import { ConsoleSpaceSwitcher } from '../components/console-space-switcher'
import { AnnouncementsPanel } from './components/announcements-panel'
import {
  ModelUsagePanel,
  type UsageInterval,
} from './components/model-usage-panel'
import { SummaryCard, TodayCard } from './components/summary-cards'
import { isLinkAiOverviewSection } from './lib/section'

const route = getRouteApi('/_authenticated/dashboard/$section')
const ASSET_ROOT = '/figma/linkai-console/dashboard'

function LinkAiOverviewDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { items: announcements, loading: announcementsLoading } =
    useAnnouncements()
  const [interval, setInterval] = useState<UsageInterval>('day')
  const timeRange = useMemo(() => computeTimeRange(7), [])

  const usageQuery = useQuery({
    queryKey: [
      'linkai-console',
      'overview',
      'usage',
      interval,
      timeRange.start_timestamp,
      timeRange.end_timestamp,
    ],
    queryFn: () =>
      getUserQuotaDates({
        start_timestamp: timeRange.start_timestamp,
        end_timestamp: timeRange.end_timestamp,
        default_time: interval,
      }),
    staleTime: 60 * 1000,
  })

  const usageData = useMemo(
    () => usageQuery.data?.data ?? [],
    [usageQuery.data?.data]
  )
  const todayStart = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return Math.floor(start.getTime() / 1000)
  }, [])
  const today = useMemo(
    () =>
      usageData.reduce(
        (summary, item) => {
          if ((Number(item.created_at) || 0) < todayStart) return summary
          summary.quota += Number(item.quota) || 0
          summary.requests += Number(item.count) || 0
          summary.tokens += Number(item.token_used) || 0
          return summary
        },
        { quota: 0, requests: 0, tokens: 0 }
      ),
    [todayStart, usageData]
  )

  const displayName =
    user?.display_name || user?.username || user?.email || t('User')

  return (
    <div className='min-h-0 flex-1 overflow-y-auto bg-black'>
      <div className='relative mx-auto w-full max-w-[1460px] px-4 py-7 sm:px-6 lg:py-9 2xl:px-8'>
        <div className='mt-6 w-full lg:absolute lg:top-7 lg:right-8 lg:mt-0 lg:w-[326px]'>
          <ConsoleSpaceSwitcher collapsed={false} />
        </div>

        <div className='mt-[clamp(56px,4.17vw,80px)] flex flex-wrap items-center gap-3 lg:mt-[clamp(74px,5.2vw,100px)]'>
          <img
            src={`${ASSET_ROOT}/welcome.png`}
            alt=''
            className='size-[clamp(32px,2.03vw,39px)] object-contain'
          />
          <h1 className='text-[clamp(20px,1.56vw,30px)] font-normal tracking-[-0.025em] text-white'>
            {t('Welcome home, {{name}}', { name: displayName })}
          </h1>
          <span className='inline-flex rounded-full bg-[#191919] px-3 py-1.5 text-[11px] text-white/75'>
            {t('ID: {{id}}', { id: user?.id ?? '-' })}
          </span>
        </div>

        <div className='mt-5 grid gap-3.5 md:grid-cols-3'>
          <SummaryCard
            title={t('Account balance')}
            value={formatQuota(Number(user?.quota ?? 0))}
            description={`${t('User group')}: ${user?.group ?? 'default'}`}
            icon='balance'
            action={{ label: t('Go to recharge'), to: '/wallet' }}
          />
          <SummaryCard
            title={t('Cumulative consumption')}
            value={formatQuota(Number(user?.used_quota ?? 0))}
            description={t('Total usage since account creation')}
            icon='consumption'
            action={{ label: t('View logs'), to: '/usage-logs/$section' }}
          />
          <SummaryCard
            title={t('Dashboard request count')}
            value={formatNumber(Number(user?.request_count ?? 0))}
            description={t('Total API requests processed')}
            icon='requests'
          />
        </div>

        <div className='mt-3.5 grid gap-3.5 md:grid-cols-3'>
          <TodayCard
            todayLabel={t('Dashboard today label')}
            label={t('Consumption')}
            value={formatQuota(today.quota)}
            icon='today-consumption'
          />
          <TodayCard
            todayLabel={t('Dashboard today label')}
            label={t('Dashboard requests label')}
            value={formatNumber(today.requests)}
            icon='today-requests'
          />
          <TodayCard
            todayLabel={t('Dashboard today label')}
            label={t('Dashboard token label')}
            value={formatCompactNumber(today.tokens)}
            icon='today-tokens'
          />
        </div>

        <div className='mt-3.5 grid gap-3.5 xl:grid-cols-[minmax(0,2.04fr)_minmax(320px,1fr)]'>
          <ModelUsagePanel
            data={usageData}
            error={usageQuery.isError}
            interval={interval}
            loading={usageQuery.isLoading}
            onIntervalChange={setInterval}
            onRefresh={() => {
              void usageQuery.refetch()
            }}
            refreshing={usageQuery.isFetching}
          />
          <AnnouncementsPanel
            items={announcements}
            loading={announcementsLoading}
          />
        </div>
      </div>
    </div>
  )
}

export function LinkAiDashboard() {
  const params = route.useParams()

  if (!isLinkAiOverviewSection(params.section)) return <Dashboard />
  return <LinkAiOverviewDashboard />
}
