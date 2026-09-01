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
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import type { useOAuthLogin } from '@/features/auth/hooks/use-oauth-login'
import type { SystemStatus } from '@/features/auth/types'

import { LinkAiOAuthProviderGrid } from './oauth-provider-grid'

type OAuthHandlers = ReturnType<typeof useOAuthLogin>

function makeOAuth(overrides: Partial<OAuthHandlers> = {}): OAuthHandlers {
  return {
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
    ...overrides,
  } as OAuthHandlers
}

const ALL_PROVIDERS_STATUS = {
  wechat_login: true,
  github_oauth: true,
  discord_oauth: true,
  oidc_enabled: true,
  linuxdo_oauth: true,
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
} as SystemStatus

function renderGrid(oauth: OAuthHandlers, onWeChatLogin = vi.fn()) {
  return render(
    <LinkAiOAuthProviderGrid
      status={ALL_PROVIDERS_STATUS}
      oauth={oauth}
      githubIconSrc='/assets/github-mark.png'
      guardAuthAction={(action) => void action()}
      onWeChatLogin={onWeChatLogin}
    />
  )
}

describe('LinkAI OAuth provider grid', () => {
  test('shows githubButtonText with the pill styling and page artwork icon', () => {
    renderGrid(makeOAuth())

    const github = screen.getByRole('button', { name: 'Continue with GitHub' })
    expect(github).toBeEnabled()
    expect(github).toHaveClass('rounded-full')
    const icon = github.querySelector('img')
    expect(icon).toHaveAttribute('src', '/assets/github-mark.png')
  })

  test('surfaces the GitHub timeout feedback text while disabled', () => {
    renderGrid(
      makeOAuth({
        githubButtonText:
          'Request timed out, please refresh and restart GitHub login',
        githubButtonDisabled: true,
      })
    )

    const github = screen.getByRole('button', {
      name: 'Request timed out, please refresh and restart GitHub login',
    })
    expect(github).toBeDisabled()
  })

  test('disables every provider while an OAuth start is in flight', () => {
    const { rerender } = render(
      <LinkAiOAuthProviderGrid
        status={ALL_PROVIDERS_STATUS}
        oauth={makeOAuth({ isLoading: true })}
        githubIconSrc='/assets/github-mark.png'
        guardAuthAction={(action) => void action()}
        onWeChatLogin={vi.fn()}
      />
    )

    for (const name of [
      'WeChat',
      'Continue with GitHub',
      'Discord',
      'OIDC',
      'LinuxDO',
      'Acme SSO',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }

    rerender(
      <LinkAiOAuthProviderGrid
        status={ALL_PROVIDERS_STATUS}
        oauth={makeOAuth({ isLoading: false })}
        githubIconSrc='/assets/github-mark.png'
        guardAuthAction={(action) => void action()}
        onWeChatLogin={vi.fn()}
      />
    )

    for (const name of [
      'WeChat',
      'Continue with GitHub',
      'Discord',
      'OIDC',
      'LinuxDO',
      'Acme SSO',
    ]) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
  })

  test('routes provider clicks through the consent guard', async () => {
    const oauth = makeOAuth()
    const onWeChatLogin = vi.fn()
    const guarded: Array<() => void | Promise<void>> = []
    const user = userEvent.setup()

    render(
      <LinkAiOAuthProviderGrid
        status={ALL_PROVIDERS_STATUS}
        oauth={oauth}
        githubIconSrc='/assets/github-mark.png'
        guardAuthAction={(action) => guarded.push(action)}
        onWeChatLogin={onWeChatLogin}
      />
    )

    await user.click(screen.getByRole('button', { name: 'WeChat' }))
    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' })
    )

    expect(guarded).toHaveLength(2)
    guarded[0]()
    guarded[1]()
    expect(onWeChatLogin).toHaveBeenCalledTimes(1)
    expect(oauth.handleGitHubLogin).toHaveBeenCalledTimes(1)
  })
})
