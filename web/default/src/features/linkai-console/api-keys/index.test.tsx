/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LinkAiApiKeys } from './index'

const mocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess },
}))

vi.mock('@/features/keys', () => ({
  ApiKeys: () => <div>Default API keys page</div>,
}))

vi.mock('@/features/keys/components/api-keys-dialogs', () => ({
  ApiKeysDialogs: () => <div>API key dialogs</div>,
}))

vi.mock('@/features/keys/components/api-keys-provider', () => ({
  ApiKeysProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/keys/components/api-keys-table', () => ({
  ApiKeysTable: ({ variant }: { variant?: string }) => (
    <div>Full API keys table: {variant}</div>
  ),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { server_address: 'https://api.example.com' } }),
}))

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: mocks.copyToClipboard,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: {
      auth: {
        user: { quota: number; request_count: number; used_quota: number }
      }
    }) => unknown
  ) =>
    selector({
      auth: { user: { quota: 100, request_count: 9, used_quota: 25 } },
    }),
}))

describe('LinkAiApiKeys', () => {
  beforeEach(() => {
    mocks.copyToClipboard.mockReset()
    mocks.toastSuccess.mockReset()
  })

  it('renders the LinkAI summary around the complete target API key adapter', () => {
    render(<LinkAiApiKeys />)

    expect(screen.getByRole('heading', { name: 'API Keys' })).toBeVisible()
    expect(screen.getByText('https://api.example.com/v1')).toBeVisible()
    expect(screen.getByText('Full API keys table: linkai')).toBeVisible()
    expect(screen.getByText('API key dialogs')).toBeVisible()
    expect(screen.queryByText('Default API keys page')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' })
    ).not.toBeInTheDocument()
  })

  it('copies the real configured API base URL', async () => {
    mocks.copyToClipboard.mockResolvedValue(true)
    render(<LinkAiApiKeys />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(mocks.copyToClipboard).toHaveBeenCalledWith(
        'https://api.example.com/v1'
      )
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Copied')
    })
  })
})
