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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  variant?: 'default' | 'linkai'
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  if (props.loading) {
    if (props.variant === 'linkai') {
      return (
        <div className='wallet-stats-card linkai-wallet-stats-grid'>
          {['balance', 'usage', 'requests'].map((key) => (
            <div key={key} className='linkai-wallet-stat-card'>
              <Skeleton className='size-[63px] shrink-0 rounded-full' />
              <div className='min-w-0 flex-1'>
                <Skeleton className='h-5 w-28' />
                <Skeleton className='mt-2 h-4 w-32' />
              </div>
              <Skeleton className='h-9 w-20' />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className='wallet-stats-card grid grid-cols-3 divide-x rounded-lg border'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div key={key} className='min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-4'>
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='mt-2 h-6 w-full sm:h-7' />
            <Skeleton className='mt-1.5 hidden h-3.5 w-24 md:block' />
          </div>
        ))}
      </div>
    )
  }

  const stats: {
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    tone: IconBadgeTone
  }[] = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t('Remaining quota'),
      icon: WalletCards,
      tone: 'success',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      tone: 'info',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      tone: 'chart-4',
    },
  ]

  if (props.variant === 'linkai') {
    return (
      <div className='wallet-stats-card linkai-wallet-stats-grid'>
        {stats.map((item) => (
          <article key={item.label} className='linkai-wallet-stat-card'>
            <span className='linkai-wallet-stat-icon' aria-hidden='true'>
              <img
                src='/figma/linkai-console/wallet/stat-ring.svg'
                alt=''
                className='linkai-wallet-stat-icon-ring'
              />
              <item.icon className='linkai-wallet-stat-icon-glyph' />
            </span>
            <span className='linkai-wallet-stat-copy'>
              <span className='linkai-wallet-stat-label'>{item.label}</span>
              <span className='linkai-wallet-stat-description'>
                {item.description}
              </span>
            </span>
            <strong className='linkai-wallet-stat-value'>{item.value}</strong>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className='wallet-stats-card grid grid-cols-3 divide-x rounded-lg border'>
      {stats.map((item) => (
        <div key={item.label} className='min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-4'>
          <div className='flex items-center gap-1.5 sm:gap-2.5'>
            <IconBadge tone={item.tone} size='stat'>
              <item.icon />
            </IconBadge>
            <div className='text-muted-foreground truncate text-[11px] font-medium tracking-wider uppercase sm:text-xs'>
              {item.label}
            </div>
          </div>

          <div className='text-foreground mt-1.5 font-mono text-sm font-bold tracking-tight break-all tabular-nums sm:mt-2.5 sm:text-2xl'>
            {item.value}
          </div>
          <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
            {item.description}
          </div>
        </div>
      ))}
    </div>
  )
}
