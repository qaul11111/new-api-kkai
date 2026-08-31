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
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { TelegramLoginWidget } from '@/features/auth/components/telegram-login-widget'
import { WeChatLoginDialog } from '@/features/auth/components/wechat-login-dialog'

import { AUTH_ASSET_ROOT, LinkAiAuthShell } from '../components/auth-shell'
import { LinkAiLegalConsent } from '../components/legal-consent'
import { LinkAiOAuthProviderGrid } from '../components/oauth-provider-grid'
import { hasConfiguredOAuthProviders } from '../components/oauth-provider-visibility'
import { LinkAiSignInForm } from './sign-in-form'
import { useLinkAiSignIn } from './use-linkai-sign-in'

export function LinkAiSignInPage() {
  const { t } = useTranslation()
  const state = useLinkAiSignIn()

  const hasOAuthGrid = hasConfiguredOAuthProviders(state.status)
  const showDivider =
    (hasOAuthGrid || state.telegramLoginEnabled) && state.passwordLoginEnabled

  return (
    <LinkAiAuthShell>
      <div className='mx-auto block w-full max-w-[504px] px-5 py-10 sm:px-0'>
        <div className='mx-auto flex h-[34px] w-[104px] items-center justify-center rounded-[15px] border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm tracking-[0.2em] text-[#9b9b9b]'>
          {t('User sign in')}
        </div>
        <h1 className='mt-4 text-center text-[28px] leading-[38px] font-semibold text-[#592fe0] sm:text-[32px]'>
          {t('Access your account')}
        </h1>
        <p className='mt-2 text-center text-sm leading-5 text-[#9b9b9b] sm:text-base'>
          {t('Choose a social account or continue with email and password')}
        </p>

        {hasOAuthGrid && (
          <div className='mt-8'>
            <LinkAiOAuthProviderGrid
              status={state.status}
              oauth={state.oauth}
              githubIconSrc={`${AUTH_ASSET_ROOT}/raw-07.png`}
              guardAuthAction={state.guardAuthAction}
              onWeChatLogin={
                state.status?.wechat_login
                  ? state.handleOpenWeChatDialog
                  : undefined
              }
            />
          </div>
        )}

        {state.telegramLoginEnabled && (
          <div className='mt-4 flex justify-center'>
            <TelegramLoginWidget
              botName={state.telegramBotName}
              onAuth={state.handleTelegramAuth}
            />
          </div>
        )}

        {!state.passwordLoginEnabled && (
          <div className='mt-6 space-y-4'>
            {state.requiresLegalConsent && (
              <LinkAiLegalConsent
                id='linkai-sign-in-legal-consent'
                status={state.status}
                checked={state.agreedToLegal}
                onCheckedChange={state.setAgreedToLegal}
              />
            )}
            {state.passkeyAvailable && (
              <button
                type='button'
                onClick={state.handlePasskeyLogin}
                className='flex h-[46px] w-full items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-base text-white transition hover:border-[#7258ce] hover:bg-[#211a31] disabled:cursor-not-allowed disabled:opacity-50'
                disabled={state.isPasskeyLoading}
              >
                {state.isPasskeyLoading && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {t('Sign in with Passkey')}
              </button>
            )}
          </div>
        )}

        {showDivider && (
          <div className='mt-10 mb-5 flex h-5 items-center gap-4 text-sm text-[#9b9b9b]'>
            <span className='h-[2px] flex-1 bg-[#2c2c2c]' />
            <span>{t('Or')}</span>
            <span className='h-[2px] flex-1 bg-[#2c2c2c]' />
          </div>
        )}

        {state.passwordLoginEnabled && <LinkAiSignInForm state={state} />}

        <div
          data-linkai-auth-footer
          className='mt-5 flex flex-col gap-3 px-1 text-sm leading-5 text-[#9b9b9b] sm:flex-row sm:items-center sm:justify-between sm:text-base'
        >
          {state.registrationAvailable && (
            <p>
              {t("Don't have an account?")}{' '}
              <Link
                to='/sign-up'
                className='text-[#eeeeee] transition hover:text-white'
              >
                {t('Register account')}
              </Link>
            </p>
          )}
          <p>
            {t('Forgot password?')}{' '}
            <Link
              to='/forgot-password'
              className='text-[#eeeeee] underline underline-offset-2 transition hover:text-white'
            >
              {t('Reset password')}
            </Link>
          </p>
        </div>
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
