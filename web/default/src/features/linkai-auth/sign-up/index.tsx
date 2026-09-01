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
import { Building2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { TelegramLoginWidget } from '@/features/auth/components/telegram-login-widget'
import { WeChatLoginDialog } from '@/features/auth/components/wechat-login-dialog'
import {
  ACCOUNT_TYPE,
  ACCOUNT_TYPE_OPTIONS,
  type AccountType,
} from '@/lib/account-type'
import { cn } from '@/lib/utils'

import { LinkAiAuthShell } from '../components/auth-shell'
import { LinkAiLegalConsent } from '../components/legal-consent'
import { LinkAiOAuthProviderGrid } from '../components/oauth-provider-grid'
import { hasConfiguredOAuthProviders } from '../components/oauth-provider-visibility'
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
          <fieldset className='mt-6'>
            <legend className='mb-2 text-sm font-medium text-white'>
              {t('Choose account type')}
            </legend>
            <div className='grid grid-cols-2 gap-3' role='radiogroup'>
              {ACCOUNT_TYPE_OPTIONS.map((option) => {
                const selected = state.accountType === option.value
                const Icon =
                  option.value === ACCOUNT_TYPE.BUSINESS ? Building2 : UserRound

                return (
                  <button
                    key={option.value}
                    type='button'
                    role='radio'
                    aria-checked={selected}
                    onClick={() => state.setAccountType(option.value)}
                    className={cn(
                      'flex min-h-[66px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-[#7258ce] focus-visible:outline-none',
                      selected
                        ? 'border-[#7258ce] bg-[#211a31] shadow-[0_0_0_1px_rgba(114,88,206,0.25)]'
                        : 'border-[#2a2a2a] bg-[#151515] hover:border-[#4a3d70]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        selected
                          ? 'bg-[#7258ce] text-white'
                          : 'bg-[#242424] text-[#aaa]'
                      )}
                    >
                      <Icon className='h-4 w-4' />
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-sm font-medium text-white'>
                        {t(option.labelKey)}
                      </span>
                      <span className='mt-0.5 block text-xs leading-4 text-[#929292]'>
                        {t(option.descriptionKey)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
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

        {showPasswordForm && <LinkAiSignUpForm state={state} />}

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
