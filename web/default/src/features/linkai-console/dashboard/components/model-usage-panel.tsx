/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { formatCompactNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  buildUsageRows,
  type UsageInterval,
  type UsageMetric,
} from '../lib/model-usage'

const ASSET_ROOT = '/figma/linkai-console/dashboard'

export type { UsageInterval } from '../lib/model-usage'

function formatUsageValue(metric: UsageMetric, value: number) {
  return metric === 'quota' ? formatQuota(value) : formatCompactNumber(value)
}

function getMetricTranslationKey(metric: UsageMetric) {
  if (metric === 'quota') return 'Consumption ratio' as const
  if (metric === 'requests') return 'Call ratio' as const
  return 'Token ratio' as const
}

type ModelUsagePanelProps = {
  data: import('@/features/dashboard/types').QuotaDataItem[]
  error: boolean
  interval: UsageInterval
  loading: boolean
  onIntervalChange: (interval: UsageInterval) => void
  onRefresh: () => void
  refreshing: boolean
}

export function ModelUsagePanel(props: ModelUsagePanelProps) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<UsageMetric>('quota')
  const rows = useMemo(
    () => buildUsageRows(props.data, metric),
    [metric, props.data]
  )
  const maxValue = Math.max(1, ...rows.map((row) => row[metric]))
  const totalQuota = props.data.reduce(
    (total, item) => total + (Number(item.quota) || 0),
    0
  )
  let content: ReactNode

  if (props.loading) {
    content = (
      <div className='w-full space-y-6' aria-label={t('Loading')}>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className='h-8 animate-pulse rounded-lg bg-white/[0.035]'
          />
        ))}
      </div>
    )
  } else if (props.error) {
    content = (
      <div className='flex w-full flex-col items-center gap-3 text-center'>
        <p className='text-sm text-[#777]'>{t('Please try again later.')}</p>
        <button
          type='button'
          onClick={props.onRefresh}
          className='rounded-md border border-[#191919] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/20 hover:text-white'
        >
          {t('Retry')}
        </button>
      </div>
    )
  } else if (rows.length === 0) {
    content = <p className='text-sm text-[#454545]'>{t('No usage data yet')}</p>
  } else {
    content = (
      <div className='w-full space-y-6'>
        {rows.map((row) => {
          const value = row[metric]

          return (
            <div
              key={row.label}
              className='grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-4'
            >
              <span className='truncate text-sm text-white/65'>
                {row.label}
              </span>
              <div className='h-2 overflow-hidden rounded-full bg-white/[0.055]'>
                <div
                  className='h-full min-w-1 rounded-full bg-[linear-gradient(90deg,#6b5cff,#b05cff,#7bdcff)] transition-[width] duration-500'
                  style={{ width: `${Math.max(2, (value / maxValue) * 100)}%` }}
                />
              </div>
              <span className='min-w-20 text-right text-xs text-white/38'>
                {formatUsageValue(metric, value)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className='flex min-h-[clamp(540px,40.83vw,784px)] flex-col rounded-xl border border-[#191919] bg-[#0a0a0a] p-[clamp(18px,1.25vw,24px)]'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <img src={`${ASSET_ROOT}/usage.png`} alt='' className='size-6' />
          <h2 className='text-[clamp(15px,0.94vw,18px)] font-medium text-white'>
            {t('Model usage statistics')}
          </h2>
        </div>
        <div className='flex items-center rounded-lg border border-[#191919] p-0.5'>
          {(['hour', 'day'] as const).map((interval) => (
            <button
              key={interval}
              type='button'
              aria-pressed={props.interval === interval}
              onClick={() => props.onIntervalChange(interval)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs transition-colors',
                props.interval === interval
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#777] hover:text-white'
              )}
            >
              {interval === 'hour' ? t('Hour') : t('Day')}
            </button>
          ))}
          <button
            type='button'
            onClick={props.onRefresh}
            disabled={props.refreshing}
            className='ml-1 flex items-center gap-1.5 rounded-md border border-[#191919] px-2.5 py-1.5 text-xs text-[#777] transition-colors hover:text-white disabled:opacity-40'
          >
            <img
              src={`${ASSET_ROOT}/refresh.png`}
              alt=''
              className={cn('size-3.5', props.refreshing && 'animate-spin')}
            />
            {t('Refresh')}
          </button>
        </div>
      </div>

      <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex rounded-full border border-[#191919] p-1'>
          {(['quota', 'requests', 'tokens'] as const).map((item) => (
            <button
              key={item}
              type='button'
              aria-pressed={metric === item}
              onClick={() => setMetric(item)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs transition-colors',
                metric === item
                  ? 'bg-white text-black'
                  : 'text-[#777] hover:text-white'
              )}
            >
              {t(getMetricTranslationKey(item))}
            </button>
          ))}
        </div>
        <span className='text-[11px] text-[#454545]'>
          {t('Data sync interval: 20 minutes')}
        </span>
      </div>

      <p className='mt-6 text-sm text-[#777]'>
        {t('Last 7 days consumption {{total}}, daily average {{average}}', {
          total: formatQuota(totalQuota),
          average: formatQuota(totalQuota / 7),
        })}
      </p>

      <div className='flex min-h-0 flex-1 items-center justify-center px-2 py-10'>
        {content}
      </div>
    </section>
  )
}
