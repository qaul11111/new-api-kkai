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
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { SystemStatus } from '../types'
import { OAuthProviders } from './oauth-providers'

const oauthHandlers = {
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
}

vi.mock('../hooks/use-oauth-login', () => ({
  useOAuthLogin: () => oauthHandlers,
}))

function statusWith(flags: Partial<SystemStatus>): SystemStatus {
  return flags as SystemStatus
}

describe('OAuthProviders visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders every configured provider with correct generic labels', () => {
    render(
      <OAuthProviders
        status={statusWith({
          github_oauth: true,
          github_client_id: 'gh',
          discord_oauth: true,
          discord_client_id: 'dc',
          oidc_enabled: true,
          oidc_client_id: 'oidc',
          linuxdo_oauth: true,
          linuxdo_client_id: 'ld',
          wechat_login: true,
          telegram_oauth: true,
          telegram_bot_name: 'linkai_bot',
          custom_oauth_providers: [
            {
              id: 1,
              name: 'Acme SSO',
              slug: 'acme',
              icon: '',
              client_id: 'acme-id',
              authorization_endpoint: 'https://sso.example.com/auth',
              scopes: 'openid',
            },
          ],
        })}
        onWeChatLogin={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /Continue with GitHub/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Continue with Discord/ })
    ).toBeInTheDocument()
    // OIDC must stay generic, never hard-coded as Google
    expect(
      screen.getByRole('button', { name: /Continue with OIDC/ })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /google/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Continue with LinuxDO/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Continue with WeChat/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Continue with Acme SSO/ })
    ).toBeInTheDocument()
    expect(screen.getByTestId('telegram-login-widget')).toBeInTheDocument()
  })

  test('renders nothing when no provider is configured', () => {
    const { container } = render(
      <OAuthProviders status={statusWith({})} onWeChatLogin={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  test('hides providers that are not configured', () => {
    render(
      <OAuthProviders
        status={statusWith({ discord_oauth: true, discord_client_id: 'dc' })}
      />
    )

    expect(
      screen.getByRole('button', { name: /Continue with Discord/ })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Continue with GitHub/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Continue with WeChat/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('telegram-login-widget')
    ).not.toBeInTheDocument()
  })

  test('routes the Telegram widget authorization through the consent gate', () => {
    const onAuthBlocked = vi.fn()
    render(
      <OAuthProviders
        status={statusWith({
          telegram_oauth: true,
          telegram_bot_name: 'linkai_bot',
        })}
        disabled
        onAuthBlocked={onAuthBlocked}
      />
    )

    const script = screen
      .getByTestId('telegram-login-widget')
      .querySelector('script')
    const callbackName = (script?.getAttribute('data-onauth') ?? '').replace(
      '(user)',
      ''
    )
    const callback = (window as unknown as Record<string, unknown>)[
      callbackName
    ] as (user: unknown) => void
    callback({ id: 1, auth_date: 1, hash: 'h' })

    expect(onAuthBlocked).toHaveBeenCalledTimes(1)
    expect(oauthHandlers.handleTelegramAuth).not.toHaveBeenCalled()
  })
})
