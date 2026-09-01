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
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { TelegramAuthPayload } from '@/features/auth/types'

import { bindTelegramAccount } from '../../api'
import { TelegramBindDialog } from './telegram-bind-dialog'

vi.mock('../../api', () => ({
  bindTelegramAccount: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const mockedBind = vi.mocked(bindTelegramAccount)

const payload: TelegramAuthPayload = {
  id: 12345,
  auth_date: 1720000000,
  hash: 'abc123',
  username: 'ada',
}

async function simulateWidgetAuth() {
  await waitFor(() => {
    expect(document.querySelector('script[data-telegram-login]')).not.toBeNull()
  })
  const script = document.querySelector('script[data-telegram-login]')
  if (!script) throw new Error('Telegram widget script was not injected')
  const callbackName = (script.getAttribute('data-onauth') ?? '').replace(
    '(user)',
    ''
  )
  const callback = (window as unknown as Record<string, unknown>)[
    callbackName
  ] as (user: TelegramAuthPayload) => void
  callback(payload)
}

describe('TelegramBindDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('binds via the real API, closes, and refreshes on success', async () => {
    mockedBind.mockResolvedValue({ success: true, message: '' })
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    render(
      <TelegramBindDialog
        open
        onOpenChange={onOpenChange}
        botName='linkai_bot'
        onSuccess={onSuccess}
      />
    )

    await simulateWidgetAuth()

    await waitFor(() => {
      expect(mockedBind).toHaveBeenCalledWith(payload)
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  test('keeps the dialog open and shows the backend error on failure', async () => {
    mockedBind.mockResolvedValue({
      success: false,
      message: 'Telegram account already bound',
    })
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    render(
      <TelegramBindDialog
        open
        onOpenChange={onOpenChange}
        botName='linkai_bot'
        onSuccess={onSuccess}
      />
    )

    await simulateWidgetAuth()

    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Telegram account already bound')
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  test('contains no static placeholder widget', async () => {
    mockedBind.mockResolvedValue({ success: true, message: '' })

    render(
      <TelegramBindDialog
        open
        onOpenChange={vi.fn()}
        botName='linkai_bot'
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        document.querySelector('script[data-telegram-login="linkai_bot"]')
      ).not.toBeNull()
    })
    expect(screen.queryByText('Telegram Login Widget')).not.toBeInTheDocument()
  })
})
