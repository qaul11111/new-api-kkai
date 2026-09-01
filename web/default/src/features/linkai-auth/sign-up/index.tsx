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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { TelegramLoginWidget } from '@/features/auth/components/telegram-login-widget'
import { WeChatLoginDialog } from '@/features/auth/components/wechat-login-dialog'
import type { AccountType } from '@/lib/account-type'

import { LinkAiAuthShell } from '../components/auth-shell'
import { LinkAiLegalConsent } from '../components/legal-consent'
import { LinkAiOAuthProviderGrid } from '../components/oauth-provider-grid'
import { hasConfiguredOAuthProviders } from '../components/oauth-provider-visibility'
import { LinkAiAccountTypeSelector } from './account-type-selector'
import { LinkAiSignUpForm } from './sign-up-form'
import { useLinkAiSignUp } from './use-linkai-sign-up'

const SIGN_UP_ASSET_ROOT = '/figma/linkai-auth/sign-up'

export function LinkAiSignUpPage({
  initialAccountType,
}: {
  initialAccountType?: AccountType
}) {
  const { t } = useTranslation()
  const state = useLinkAiSignUp(initialAccountType)

  const showOAuthOptions =
    state.registerEnabled &&
    state.oauthRegistrationEnabled &&
    (hasConfiguredOAuthProviders(state.status) || state.telegramLoginEnabled)
  const showPasswordForm =
    state.registerEnabled && state.passwordRegistrationEnabled
  const showDivider = showOAuthOptions && showPasswordForm

  return (
    <LinkAiAuthShell
      assetRoot={SIGN_UP_ASSET_ROOT}
      backgroundFile='raw-01.png'
      backgroundOverlayFile='raw-06.avif'
      panelFile='raw-05.avif'
      splitLogo
    >
      <div className='mx-auto block w-full max-w-[504px] px-5 py-10 sm:px-0'>
        <div className='mx-auto flex h-[34px] w-[104px] items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm tracking-[0.2em] text-[#9b9b9b]'>
          {t('Register account')}
        </div>
        <h1 className='mt-4 text-center text-[28px] leading-[38px] font-semibold tracking-[-0.02em] text-[#592fe0] sm:text-[32px]'>
          {t('Create your account')}
        </h1>
        <p className='mt-2 text-center text-sm leading-5 text-[#9b9b9b] sm:text-base'>
          {t('Choose a social account or register with email')}
        </p>

        {state.registerEnabled && (
          <LinkAiAccountTypeSelector
            value={state.accountType}
            onChange={state.setAccountType}
          />
        )}

        {!state.registerEnabled && (
          <p
            data-linkai-register-disabled
            className='mt-8 rounded-[16px] border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-5 text-center text-sm text-[#9b9b9b]'
          >
            {t('Registration is currently disabled')}
          </p>
        )}

        {showOAuthOptions && (
          <div className='mt-6'>
            <LinkAiOAuthProviderGrid
              status={state.status}
              oauth={state.oauth}
              githubIconSrc={`${SIGN_UP_ASSET_ROOT}/raw-09.png`}
              guardAuthAction={state.guardAuthAction}
              onWeChatLogin={
                state.status?.wechat_login
                  ? state.handleOpenWeChatDialog
                  : undefined
              }
            />
            {state.telegramLoginEnabled && (
              <div className='mt-4 flex justify-center'>
                <TelegramLoginWidget
                  botName={state.telegramBotName}
                  onAuth={state.handleTelegramAuth}
                />
              </div>
            )}
          </div>
        )}

        {showOAuthOptions &&
          !showPasswordForm &&
          state.requiresLegalConsent && (
            <div className='mt-6'>
              <LinkAiLegalConsent
                id='linkai-sign-up-oauth-legal-consent'
                status={state.status}
                checked={state.agreedToLegal}
                onCheckedChange={state.setAgreedToLegal}
              />
            </div>
          )}

        {showDivider && (
          <div className='mt-10 mb-5 flex h-5 items-center gap-4 text-sm text-[#9b9b9b]'>
            <span className='h-[2px] flex-1 bg-[#2c2c2c]' />
            <span>{t('Or')}</span>
            <span className='h-[2px] flex-1 bg-[#2c2c2c]' />
          </div>
        )}

        {showPasswordForm && (
          <div
            data-linkai-auth-password-section
            className={showDivider ? undefined : 'mt-6'}
          >
            <LinkAiSignUpForm state={state} />
          </div>
        )}

        <p
          data-linkai-auth-footer
          className='mt-6 text-center text-sm text-[#9b9b9b] sm:text-base'
        >
          {t('Already have an account?')}{' '}
          <Link
            to='/sign-in'
            className='text-[#eeeeee] transition hover:text-white'
          >
            {t('Sign in to your account')}
          </Link>
        </p>
      </div>

      {state.status?.wechat_login && (
        <WeChatLoginDialog
          open={state.isWeChatDialogOpen}
          onOpenChange={state.setIsWeChatDialogOpen}
          qrCodeUrl={state.wechatQrCodeUrl}
          isSubmitting={state.isWeChatSubmitting}
          onSubmit={state.handleWeChatLogin}
          disabled={state.requiresLegalConsent && !state.agreedToLegal}
        />
      )}
    </LinkAiAuthShell>
  )
}
