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
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import {
  buildTelegramAuthParams,
  getOAuthState,
  telegramLogin,
  wechatLoginByCode,
} from './api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)

describe('buildTelegramAuthParams', () => {
  test('keeps only the fields Telegram actually signed', () => {
    const params = buildTelegramAuthParams({
      id: 12345,
      auth_date: 1720000000,
      hash: 'abc123',
      first_name: 'Ada',
      last_name: '',
      username: undefined,
      photo_url: undefined,
      lang: 'en',
    })

    expect(params).toEqual({
      id: '12345',
      auth_date: '1720000000',
      hash: 'abc123',
      first_name: 'Ada',
      lang: 'en',
    })
  })
})

describe('telegramLogin', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  test('calls the Telegram login endpoint with the signed fields as query params', async () => {
    mockedGet.mockResolvedValue({
      data: { success: true, message: '', data: { id: 7 } },
    })

    const result = await telegramLogin({
      id: 99,
      auth_date: 1720000001,
      hash: 'feedface',
      username: 'grace',
    })

    expect(mockedGet).toHaveBeenCalledWith('/api/oauth/telegram/login', {
      params: {
        id: '99',
        auth_date: '1720000001',
        hash: 'feedface',
        username: 'grace',
      },
    })
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe(7)
  })
})

describe('registration account type forwarding', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    window.localStorage.clear()
  })

  test('includes the selected account type in OAuth state creation', async () => {
    window.localStorage.setItem('aff', 'affiliate-1')
    mockedGet.mockResolvedValue({
      data: { success: true, data: 'oauth-state' },
    })

    await expect(getOAuthState('business')).resolves.toBe('oauth-state')
    expect(mockedGet).toHaveBeenCalledWith('/api/oauth/state', {
      params: { aff: 'affiliate-1', account_type: 'business' },
    })
  })

  test('includes the selected account type in WeChat registration login', async () => {
    mockedGet.mockResolvedValue({
      data: { success: true, message: '', data: { id: 9 } },
    })

    await wechatLoginByCode('wechat-code', 'business')
    expect(mockedGet).toHaveBeenCalledWith('/api/oauth/wechat', {
      params: { code: 'wechat-code', account_type: 'business' },
    })
  })
})
