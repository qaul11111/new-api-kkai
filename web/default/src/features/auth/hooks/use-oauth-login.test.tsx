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
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { telegramLogin } from '../api'
import type { SystemStatus, TelegramAuthPayload } from '../types'
import { useOAuthLogin } from './use-oauth-login'

const handleLoginSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('../api', () => ({
  getOAuthState: vi.fn(),
  telegramLogin: vi.fn(),
}))

vi.mock('./use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess,
    redirectTo2FA: vi.fn(),
    redirectToLogin: vi.fn(),
    redirectToRegister: vi.fn(),
  }),
}))

const mockedTelegramLogin = vi.mocked(telegramLogin)

const telegramStatus = {
  telegram_oauth: true,
  telegram_bot_name: 'linkai_bot',
} as unknown as SystemStatus

const payload: TelegramAuthPayload = {
  id: 12345,
  auth_date: 1720000000,
  hash: 'abc123',
  username: 'ada',
}

describe('useOAuthLogin Telegram authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('logs the user in and redirects after a successful Telegram auth', async () => {
    mockedTelegramLogin.mockResolvedValue({
      success: true,
      message: '',
      data: { id: 7 },
    })
    const { result } = renderHook(() => useOAuthLogin(telegramStatus))

    await result.current.handleTelegramAuth(payload, '/dashboard/overview')

    expect(mockedTelegramLogin).toHaveBeenCalledWith(payload)
    await waitFor(() => {
      expect(handleLoginSuccess).toHaveBeenCalledWith(
        { id: 7 },
        '/dashboard/overview'
      )
    })
  })

  test('surfaces the backend message when Telegram login is rejected', async () => {
    const { toast } = await import('sonner')
    mockedTelegramLogin.mockResolvedValue({
      success: false,
      message: 'Telegram account is not bound',
    })
    const { result } = renderHook(() => useOAuthLogin(telegramStatus))

    await result.current.handleTelegramAuth(payload)

    expect(toast.error).toHaveBeenCalledWith('Telegram account is not bound')
    expect(handleLoginSuccess).not.toHaveBeenCalled()
  })

  test('rejects malformed widget payloads before calling the API', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useOAuthLogin(telegramStatus))

    await result.current.handleTelegramAuth({
      ...payload,
      hash: '',
    })

    expect(mockedTelegramLogin).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
    expect(handleLoginSuccess).not.toHaveBeenCalled()
  })
})
