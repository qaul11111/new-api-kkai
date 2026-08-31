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
import { Link2, Shield } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { IconDiscord, IconLinuxDo, IconWeChat } from '@/assets/brand-icons'
import type { useOAuthLogin } from '@/features/auth/hooks/use-oauth-login'
import type { SystemStatus } from '@/features/auth/types'

type OAuthHandlers = ReturnType<typeof useOAuthLogin>

const PILL_BUTTON_CLASS =
  'flex h-[46px] items-center justify-center gap-3 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-base text-white transition hover:-translate-y-0.5 hover:border-[#7258ce] hover:bg-[#211a31] focus-visible:ring-2 focus-visible:ring-[#7258ce] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'

type LinkAiOAuthProviderGridProps = {
  status: SystemStatus | null
  oauth: OAuthHandlers
  /** Asset URL for the GitHub pill icon, specific to each auth page artwork. */
  githubIconSrc: string
  /** Wraps every provider action so pages can enforce legal consent first. */
  guardAuthAction: (action: () => void | Promise<void>) => void
  onWeChatLogin?: () => void
}

export function LinkAiOAuthProviderGrid({
  status,
  oauth,
  githubIconSrc,
  guardAuthAction,
  onWeChatLogin,
}: LinkAiOAuthProviderGridProps) {
  const { t } = useTranslation()
  if (!status) return null

  // While an OAuth start is in flight, every provider triggers the same
  // session-reset + state request, so the whole grid is disabled to prevent
  // parallel starts.
  const oauthStartInFlight = oauth.isLoading

  const buttons: ReactNode[] = []

  if (status.wechat_login && onWeChatLogin) {
    buttons.push(
      <button
        key='wechat'
        type='button'
        disabled={oauthStartInFlight}
        onClick={() => guardAuthAction(onWeChatLogin)}
        className={PILL_BUTTON_CLASS}
      >
        <IconWeChat className='h-5 w-5' aria-hidden='true' />
        {t('WeChat')}
      </button>
    )
  }

  if (status.github_oauth) {
    buttons.push(
      <button
        key='github'
        type='button'
        disabled={oauth.githubButtonDisabled || oauthStartInFlight}
        onClick={() => guardAuthAction(oauth.handleGitHubLogin)}
        className={PILL_BUTTON_CLASS}
      >
        <img
          src={githubIconSrc}
          alt=''
          className='h-[18px] w-4 object-contain'
          aria-hidden='true'
        />
        {oauth.githubButtonText}
      </button>
    )
  }

  if (status.discord_oauth) {
    buttons.push(
      <button
        key='discord'
        type='button'
        disabled={oauthStartInFlight}
        onClick={() => guardAuthAction(oauth.handleDiscordLogin)}
        className={PILL_BUTTON_CLASS}
      >
        <IconDiscord className='h-5 w-5' aria-hidden='true' />
        {t('Discord')}
      </button>
    )
  }

  if (status.oidc_enabled) {
    buttons.push(
      <button
        key='oidc'
        type='button'
        disabled={oauthStartInFlight}
        onClick={() => guardAuthAction(oauth.handleOIDCLogin)}
        className={PILL_BUTTON_CLASS}
      >
        <Shield className='h-5 w-5' aria-hidden='true' />
        {t('OIDC')}
      </button>
    )
  }

  if (status.linuxdo_oauth) {
    buttons.push(
      <button
        key='linuxdo'
        type='button'
        disabled={oauthStartInFlight}
        onClick={() => guardAuthAction(oauth.handleLinuxDOLogin)}
        className={PILL_BUTTON_CLASS}
      >
        <IconLinuxDo className='h-5 w-5' aria-hidden='true' />
        {t('LinuxDO')}
      </button>
    )
  }

  for (const provider of status.custom_oauth_providers ?? []) {
    buttons.push(
      <button
        key={`custom-${provider.slug}`}
        type='button'
        disabled={oauthStartInFlight}
        onClick={() =>
          guardAuthAction(() => oauth.handleCustomOAuthLogin(provider))
        }
        className={PILL_BUTTON_CLASS}
      >
        <Link2 className='h-5 w-5' aria-hidden='true' />
        {provider.name}
      </button>
    )
  }

  if (buttons.length === 0) return null

  return (
    <div
      data-linkai-oauth-grid
      className='grid grid-cols-1 gap-3 sm:grid-cols-2'
    >
      {buttons}
    </div>
  )
}
