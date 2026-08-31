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

import { AnnouncementDetailModal } from '@/features/dashboard/components/overview/announcement-detail-dialog'
import { getPreviewText } from '@/features/dashboard/lib'
import type { AnnouncementItem } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

import { isPricingAnnouncement } from '../lib/announcements'

type AnnouncementTab = 'pricing' | 'system'

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

type AnnouncementsPanelProps = {
  items: AnnouncementItem[]
  loading: boolean
}

export function AnnouncementsPanel(props: AnnouncementsPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AnnouncementTab>('system')
  const [selected, setSelected] = useState<AnnouncementItem | null>(null)
  const visibleItems = useMemo(
    () =>
      props.items.filter((item) =>
        tab === 'pricing' ? isPricingAnnouncement(item) : true
      ),
    [props.items, tab]
  )
  let content: ReactNode

  if (props.loading) {
    content = (
      <div className='space-y-3' aria-label={t('Loading')}>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className='h-16 animate-pulse rounded-lg bg-white/[0.035]'
          />
        ))}
      </div>
    )
  } else if (visibleItems.length === 0) {
    content = (
      <div className='flex min-h-80 items-center justify-center text-sm text-[#454545]'>
        {t('No announcements at this time')}
      </div>
    )
  } else {
    const [featured, ...rest] = visibleItems

    content = (
      <div className='space-y-2'>
        <button
          type='button'
          onClick={() => setSelected(featured)}
          className='w-full rounded-lg border border-[#191919] px-4 py-4 text-left transition-colors hover:border-white/15 hover:bg-white/[0.025]'
        >
          <div className='flex items-center justify-between gap-3'>
            <span className='rounded-md bg-white/[0.07] px-2 py-1 text-[11px] text-[#777]'>
              {t('Notice')}
            </span>
            <span className='text-[11px] text-[#454545]'>
              {formatDate(featured.publishDate)}
            </span>
          </div>
          <p className='mt-3 line-clamp-2 text-sm leading-6 text-[#999]'>
            {getPreviewText(featured.content)}
          </p>
        </button>

        {rest.slice(0, 7).map((item, index) => (
          <button
            key={item.id ?? `${item.publishDate}-${index}`}
            type='button'
            onClick={() => setSelected(item)}
            className='flex w-full items-center gap-3 rounded-lg border border-[#191919] px-4 py-3 text-left transition-colors hover:border-white/15 hover:bg-white/[0.025]'
          >
            <span className='rounded-md bg-white/[0.07] px-2 py-1 text-[10px] text-[#777]'>
              {t('Notice')}
            </span>
            <span className='min-w-0 flex-1 truncate text-xs text-[#777]'>
              {getPreviewText(item.content)}
            </span>
            <span className='shrink-0 text-[10px] text-[#454545]'>
              {formatDate(item.publishDate)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <section className='flex min-h-[clamp(540px,40.83vw,784px)] flex-col rounded-xl border border-[#191919] bg-[#0a0a0a] p-[clamp(14px,1.04vw,20px)]'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex rounded-full border border-[#191919] p-1'>
          {(['system', 'pricing'] as const).map((item) => (
            <button
              key={item}
              type='button'
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs transition-colors',
                tab === item
                  ? 'bg-white text-black'
                  : 'text-[#777] hover:text-white'
              )}
            >
              {item === 'system'
                ? t('System announcements')
                : t('Pricing notice')}
            </button>
          ))}
        </div>
        <span className='text-[11px] text-[#454545]'>{t('Subscription')}</span>
      </div>

      <div className='mt-5 min-h-0 flex-1 overflow-y-auto'>{content}</div>

      <AnnouncementDetailModal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        announcement={selected}
      />
    </section>
  )
}
