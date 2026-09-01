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
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { SystemStatus } from '../types'
import { WeChatLoginDialog } from './wechat-login-dialog'
import { resolveWeChatQrCodeUrl } from './wechat-qr-code'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

describe('resolveWeChatQrCodeUrl', () => {
  test('reads the QR code from the current and legacy status keys', () => {
    expect(resolveWeChatQrCodeUrl(null)).toBe('')
    expect(resolveWeChatQrCodeUrl({} as SystemStatus)).toBe('')
    expect(
      resolveWeChatQrCodeUrl({
        wechat_qrcode: 'https://img/qr.png',
      } as SystemStatus)
    ).toBe('https://img/qr.png')
    expect(
      resolveWeChatQrCodeUrl({
        WeChatAccountQRCodeImageURL: 'https://img/legacy.png',
      } as unknown as SystemStatus)
    ).toBe('https://img/legacy.png')
    expect(
      resolveWeChatQrCodeUrl({
        data: { wechat_qrcode: 'https://img/nested.png' },
      } as unknown as SystemStatus)
    ).toBe('https://img/nested.png')
  })
})

describe('WeChatLoginDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows the configured QR code and submits the trimmed code', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <WeChatLoginDialog
        open
        onOpenChange={vi.fn()}
        qrCodeUrl='https://img/qr.png'
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByAltText('WeChat login QR code')).toHaveAttribute(
      'src',
      'https://img/qr.png'
    )

    await user.type(screen.getByLabelText('Verification code'), ' 123456 ')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('123456')
    })
  })

  test('blocks empty codes and shows the error state', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <WeChatLoginDialog
        open
        onOpenChange={vi.fn()}
        qrCodeUrl=''
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    )

    expect(
      screen.getByText('QR code is not configured. Please contact support.')
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Verification code'), '   ')
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toBeDisabled()
    await user.click(confirmButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('disables actions while submitting', () => {
    render(
      <WeChatLoginDialog
        open
        onOpenChange={vi.fn()}
        qrCodeUrl='https://img/qr.png'
        isSubmitting
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
