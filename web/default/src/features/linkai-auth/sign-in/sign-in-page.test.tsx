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
import { act, render, renderHook, screen } from '@testing-library/react'
import React, { type AnchorHTMLAttributes } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { wechatLoginByCode } from '@/features/auth/api'
import type { SystemStatus } from '@/features/auth/types'

import { LinkAiSignInPage } from './index'
import { useLinkAiSignIn } from './use-linkai-sign-in'

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
}

const mockState = vi.hoisted(() => ({
  status: null as SystemStatus | null,
  passkeySupported: false,
}))

const oauthHandlers = vi.hoisted(() => ({
  isLoading: false,
  isTelegramLoading: false,
  githubButtonText: 'Continue with GitHub',
  githubButtonDisabled: false,
  handleGitHubLogin: vi.fn(),
  handleDiscordLogin: vi.fn(),
  handleOIDCLogin: vi.fn(),
  handleLinuxDOLogin: vi.fn(),
  handleTelegramAuth: vi.fn(),
  handleCustomOAuthLogin: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, ...props }: MockLinkProps) =>
    React.createElement('a', { ...props, href: to }),
  useSearch: () => ({ redirect: undefined }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: mockState.status, loading: false }),
}))

vi.mock('@/features/auth/hooks/use-oauth-login', () => ({
  useOAuthLogin: () => oauthHandlers,
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: vi.fn(),
    redirectTo2FA: vi.fn(),
    redirectToLogin: vi.fn(),
    redirectToRegister: vi.fn(),
  }),
}))

vi.mock('@/features/auth/hooks/use-turnstile', () => ({
  useTurnstile: () => ({
    isTurnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileToken: '',
    setTurnstileToken: vi.fn(),
    validateTurnstile: () => true,
  }),
}))

vi.mock('@/features/auth/api', () => ({
  login: vi.fn(),
  wechatLoginByCode: vi.fn(),
}))

vi.mock('@/features/auth/passkey', () => ({
  beginPasskeyLogin: vi.fn(),
  finishPasskeyLogin: vi.fn(),
}))

vi.mock('@/lib/passkey', () => ({
  isPasskeySupported: () => Promise.resolve(mockState.passkeySupported),
  buildAssertionResult: vi.fn(),
  prepareCredentialRequestOptions: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

function setStatus(flags: Partial<SystemStatus>) {
  mockState.status = flags as SystemStatus
}

const mockedWechatLoginByCode = vi.mocked(wechatLoginByCode)

describe('LinkAI sign-in page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.passkeySupported = false
  })

  test('renders only the configured providers with a generic OIDC label', () => {
    setStatus({
      github_oauth: true,
      github_client_id: 'gh',
      discord_oauth: true,
      oidc_enabled: true,
      linuxdo_oauth: true,
      wechat_login: true,
      wechat_qrcode: 'https://example.com/qr.png',
      telegram_oauth: true,
      telegram_bot_name: 'linkai_bot',
      custom_oauth_providers: [
        {
          id: 1,
          name: 'Acme SSO',
          slug: 'acme',
          icon: '',
          client_id: 'id',
          authorization_endpoint: 'https://sso.example.com/auth',
          scopes: 'openid',
        },
      ],
    })

    render(<LinkAiSignInPage />)

    expect(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discord' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OIDC' })).toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'LinuxDO' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'WeChat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acme SSO' })).toBeInTheDocument()
    expect(screen.getByTestId('telegram-login-widget')).toBeInTheDocument()
  })

  test('renders no provider buttons when nothing is configured', () => {
    setStatus({ password_login_enabled: true })

    render(<LinkAiSignInPage />)

    expect(
      screen.queryByRole('button', { name: 'Continue with GitHub' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('telegram-login-widget')
    ).not.toBeInTheDocument()
    // Password form stays available
    expect(screen.getByLabelText('Enter email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  test('hides the password form when password login is disabled', () => {
    setStatus({ password_login_enabled: false, github_oauth: true })

    render(<LinkAiSignInPage />)

    expect(
      screen.queryByLabelText('Enter email address')
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    ).toBeInTheDocument()
  })

  test('hides the passkey button unless enabled and supported', async () => {
    setStatus({ password_login_enabled: true, passkey_login: false })
    mockState.passkeySupported = true

    const { unmount } = render(<LinkAiSignInPage />)
    expect(
      screen.queryByRole('button', { name: 'Sign in with Passkey' })
    ).not.toBeInTheDocument()
    unmount()

    setStatus({ password_login_enabled: true, passkey_login: true })
    mockState.passkeySupported = false
    render(<LinkAiSignInPage />)
    expect(
      await screen.findByRole('button', { name: 'Sign in' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sign in with Passkey' })
    ).not.toBeInTheDocument()
  })

  test('shows the passkey button when enabled and supported', async () => {
    setStatus({ password_login_enabled: true, passkey_login: true })
    mockState.passkeySupported = true

    render(<LinkAiSignInPage />)

    expect(
      await screen.findByRole('button', { name: 'Sign in with Passkey' })
    ).toBeInTheDocument()
  })

  test('hides the register link in self-use mode or when registration is off', () => {
    setStatus({ self_use_mode_enabled: true })
    const { unmount } = render(<LinkAiSignInPage />)
    expect(
      screen.queryByRole('link', { name: 'Register account' })
    ).not.toBeInTheDocument()
    unmount()

    setStatus({ register_enabled: false })
    render(<LinkAiSignInPage />)
    expect(
      screen.queryByRole('link', { name: 'Register account' })
    ).not.toBeInTheDocument()
  })

  test('shows the register link when registration is available', () => {
    setStatus({})

    render(<LinkAiSignInPage />)

    expect(
      screen.getByRole('link', { name: 'Register account' })
    ).toHaveAttribute('href', '/sign-up')
  })

  test('WeChat submit ignores same-tick re-entry and resets after settling', async () => {
    setStatus({})
    let resolveFirst: (value: {
      success: boolean
      message: string
    }) => void = () => undefined
    mockedWechatLoginByCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockResolvedValue({ success: true, message: '', data: { id: 1 } })

    const { result } = renderHook(() => useLinkAiSignIn())

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.handleWeChatLogin('code-1')
      second = result.current.handleWeChatLogin('code-1')
    })

    // The same-tick duplicate is dropped before any state can propagate.
    expect(mockedWechatLoginByCode).toHaveBeenCalledTimes(1)
    expect(result.current.isWeChatSubmitting).toBe(true)

    await act(async () => {
      resolveFirst({ success: false, message: 'bad code' })
      await Promise.all([first, second])
    })
    expect(result.current.isWeChatSubmitting).toBe(false)

    // After failure the guard resets, and after success it resets too.
    await act(async () => {
      await result.current.handleWeChatLogin('code-2')
    })
    expect(mockedWechatLoginByCode).toHaveBeenCalledTimes(2)
    expect(result.current.isWeChatSubmitting).toBe(false)
  })
})
