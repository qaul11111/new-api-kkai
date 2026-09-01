/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { CircleDollarSign, Copy, MonitorUp, WalletCards } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ApiKeys } from '@/features/keys'
import { ApiKeysDialogs } from '@/features/keys/components/api-keys-dialogs'
import { ApiKeysProvider } from '@/features/keys/components/api-keys-provider'
import { ApiKeysTable } from '@/features/keys/components/api-keys-table'
import { useStatus } from '@/hooks/use-status'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { formatNumber, formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import './linkai-api-keys.css'

function getServerAddress(status: unknown): string {
  if (!status || typeof status !== 'object') return window.location.origin

  const root = status as Record<string, unknown>
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : undefined
  const candidate =
    root.server_address ??
    root.serverAddress ??
    data?.server_address ??
    data?.serverAddress

  if (typeof candidate !== 'string' || !candidate.trim()) {
    return window.location.origin
  }
  return candidate.replace(/\/$/, '')
}

function SummaryValue(props: {
  icon: typeof WalletCards
  label: string
  value: string
}) {
  const Icon = props.icon

  return (
    <div className='linkai-key-summary-value'>
      <span>
        <Icon aria-hidden='true' />
      </span>
      <div>
        <p>{props.label}</p>
        <strong>{props.value}</strong>
      </div>
    </div>
  )
}

function ApiKeysSummary() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { status } = useStatus()
  const baseUrl = useMemo(() => {
    const address = getServerAddress(status)
    return /\/v1$/i.test(address) ? address : `${address}/v1`
  }, [status])

  const handleCopy = async () => {
    if (await copyToClipboard(baseUrl)) toast.success(t('Copied'))
  }

  return (
    <section className='linkai-key-summary' aria-label={t('API Keys')}>
      <div className='linkai-key-base-url'>
        <p>{t('Base URL')}</p>
        <div>
          <code>{baseUrl}</code>
          <button
            type='button'
            aria-label={t('Copy')}
            onClick={handleCopy}
            className='linkai-key-copy-base-url'
          >
            <Copy aria-hidden='true' />
          </button>
        </div>
      </div>

      <SummaryValue
        icon={WalletCards}
        label={t('Account balance')}
        value={formatQuota(Number(user?.quota ?? 0))}
      />
      <SummaryValue
        icon={CircleDollarSign}
        label={t('Cumulative consumption')}
        value={formatQuota(Number(user?.used_quota ?? 0))}
      />
      <SummaryValue
        icon={MonitorUp}
        label={t('Dashboard request count')}
        value={formatNumber(Number(user?.request_count ?? 0))}
      />
    </section>
  )
}

function LinkAiApiKeysContent() {
  const { t } = useTranslation()

  return (
    <main className='linkai-console-api-keys min-h-0 flex-1 overflow-y-auto bg-black'>
      <div className='linkai-key-page-content'>
        <div className='linkai-key-heading'>
          <h1>{t('API Keys')}</h1>
        </div>

        <ApiKeysSummary />
        <section className='linkai-key-table-card' aria-label={t('API Keys')}>
          <ApiKeysTable variant='linkai' />
        </section>
      </div>
    </main>
  )
}

export function LinkAiApiKeys() {
  if (typeof window === 'undefined') return <ApiKeys />

  return (
    <ApiKeysProvider>
      <LinkAiApiKeysContent />
      <ApiKeysDialogs />
    </ApiKeysProvider>
  )
}
