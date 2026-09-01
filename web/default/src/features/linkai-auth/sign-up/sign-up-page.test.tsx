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
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { type AnchorHTMLAttributes } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { register, wechatLoginByCode } from '@/features/auth/api'
import type { SystemStatus } from '@/features/auth/types'

import { LinkAiSignUpPage } from './index'
import { useLinkAiSignUp } from './use-linkai-sign-up'

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
}

const mockState = vi.hoisted(() => ({
  status: null as SystemStatus | null,
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

vi.mock('@/features/auth/hooks/use-email-verification', () => ({
  useEmailVerification: () => ({
    isSending: false,
    secondsLeft: 30,
    isActive: false,
    sendCode: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('@/features/auth/api', () => ({
  register: vi.fn(),
  wechatLoginByCode: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const mockedRegister = vi.mocked(register)
const mockedWechatLoginByCode = vi.mocked(wechatLoginByCode)

function setStatus(flags: Partial<SystemStatus>) {
  mockState.status = flags as SystemStatus
}

async function fillPasswordForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Username'), 'alice')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.type(screen.getByLabelText('Confirm password'), 'password123')
}

describe('LinkAI sign-up page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  test('registers with an independent username and no email when email verification is off', async () => {
    setStatus({ email_verification: false })
    mockedRegister.mockResolvedValue({ success: true, message: '' })
    const user = userEvent.setup()

    render(<LinkAiSignUpPage />)

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Enter email address')
    ).not.toBeInTheDocument()

    await fillPasswordForm(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1))
    const payload = mockedRegister.mock.calls[0][0]
    expect(payload.username).toBe('alice')
    expect(payload.password).toBe('password123')
    expect(payload.account_type).toBe('consumer')
    expect(payload.email).toBeUndefined()
    expect(payload.verification_code).toBeUndefined()
  })

  test('honors the B-side route default and submits the selected account type', async () => {
    setStatus({ email_verification: false })
    mockedRegister.mockResolvedValue({ success: true, message: '' })
    const user = userEvent.setup()

    render(<LinkAiSignUpPage initialAccountType='business' />)

    expect(
      screen.getByRole('radio', { name: /Business account/ })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('radio', { name: /Personal account/ })
    ).toHaveAttribute('aria-checked', 'false')

    await fillPasswordForm(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1))
    expect(mockedRegister.mock.calls[0][0].account_type).toBe('business')
  })

  test('requires email and verification code when email verification is on', async () => {
    setStatus({ email_verification: true })
    mockedRegister.mockResolvedValue({ success: true, message: '' })
    const user = userEvent.setup()

    render(<LinkAiSignUpPage />)

    const emailInput = screen.getByLabelText('Enter email address')
    expect(emailInput).toBeInTheDocument()
    const codeInput = screen.getByLabelText('Verification code')
    expect(codeInput).toBeInTheDocument()

    await fillPasswordForm(user)
    await user.type(emailInput, 'alice@example.com')

    // Missing verification code blocks submission
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Please enter the verification code'
      )
    })
    expect(mockedRegister).not.toHaveBeenCalled()

    await user.type(codeInput, '834921')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1))
    const payload = mockedRegister.mock.calls[0][0]
    expect(payload.username).toBe('alice')
    expect(payload.email).toBe('alice@example.com')
    expect(payload.verification_code).toBe('834921')
  })

  test('shows a disabled notice and no forms when registration is off', () => {
    setStatus({ register_enabled: false, github_oauth: true })

    render(<LinkAiSignUpPage />)

    expect(
      screen.getByText('Registration is currently disabled')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create account' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Continue with GitHub' })
    ).not.toBeInTheDocument()
  })

  test('hides OAuth providers when OAuth registration is disabled', () => {
    setStatus({ oauth_register_enabled: false, github_oauth: true })

    const { container } = render(<LinkAiSignUpPage />)

    expect(
      screen.queryByRole('button', { name: 'Continue with GitHub' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create account' })
    ).toBeInTheDocument()
    expect(container.querySelector('form')?.parentElement).toHaveClass('mt-6')
  })

  test('hides the password form when password registration is disabled', () => {
    setStatus({ password_register_enabled: false, github_oauth: true })

    render(<LinkAiSignUpPage />)

    expect(
      screen.queryByRole('button', { name: 'Create account' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    ).toBeInTheDocument()
  })

  test('renders configured providers including Telegram widget and generic OIDC', () => {
    setStatus({
      github_oauth: true,
      oidc_enabled: true,
      telegram_oauth: true,
      telegram_bot_name: 'linkai_bot',
    })

    render(<LinkAiSignUpPage />)

    expect(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OIDC' })).toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
    expect(screen.getByTestId('telegram-login-widget')).toBeInTheDocument()
  })

  function fireTelegramAuth() {
    const widget = screen.getByTestId('telegram-login-widget')
    const script = widget.querySelector('script[data-onauth]')
    const callbackName = script
      ?.getAttribute('data-onauth')
      ?.replace('(user)', '')
    expect(callbackName).toBeTruthy()
    const callback = (window as unknown as Record<string, unknown>)[
      callbackName as string
    ] as (payload: unknown) => void
    callback({ id: 12345 })
  }

  test('gates OAuth-only registration behind a visible legal-consent control', async () => {
    setStatus({
      password_register_enabled: false,
      github_oauth: true,
      wechat_login: true,
      telegram_oauth: true,
      telegram_bot_name: 'linkai_bot',
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })
    const user = userEvent.setup()

    render(<LinkAiSignUpPage />)

    expect(
      screen.queryByRole('button', { name: 'Create account' })
    ).not.toBeInTheDocument()
    const consent = screen.getByRole('checkbox')
    expect(consent).not.toBeChecked()

    const { toast } = await import('sonner')

    // OAuth, WeChat, and Telegram stay blocked before consent
    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    )
    expect(toast.error).toHaveBeenCalledWith(
      'Please agree to the legal terms first'
    )
    expect(oauthHandlers.handleGitHubLogin).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'WeChat' }))
    expect(screen.queryByText('WeChat sign in')).not.toBeInTheDocument()

    fireTelegramAuth()
    expect(oauthHandlers.handleTelegramAuth).not.toHaveBeenCalled()

    // After consent, all three actions proceed
    await user.click(consent)
    expect(consent).toBeChecked()

    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    )
    expect(oauthHandlers.handleGitHubLogin).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'WeChat' }))
    expect(screen.getByText('WeChat sign in')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    fireTelegramAuth()
    expect(oauthHandlers.handleTelegramAuth).toHaveBeenCalledTimes(1)
  })

  test('does not duplicate the legal-consent control when the password form is shown', () => {
    setStatus({
      github_oauth: true,
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })

    render(<LinkAiSignUpPage />)

    expect(
      screen.getByRole('button', { name: 'Create account' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
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

    const { result } = renderHook(() => useLinkAiSignUp())

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
