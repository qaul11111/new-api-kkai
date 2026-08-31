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
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Turnstile } from '@/components/turnstile'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

import { LinkAiLegalConsent } from '../components/legal-consent'
import type { LinkAiSignUpState } from './use-linkai-sign-up'

const INPUT_CLASS =
  'h-[46px] w-full rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-6 text-base text-white transition outline-none placeholder:text-[#9b9b9b] focus:border-[#7258ce] focus:ring-2 focus:ring-[#7258ce]/20'

type LinkAiSignUpFormProps = {
  state: LinkAiSignUpState
}

export function LinkAiSignUpForm({ state }: LinkAiSignUpFormProps) {
  const { t } = useTranslation()
  const {
    agreedToLegal,
    email,
    emailVerification,
    emailVerificationRequired,
    form,
    handleSendVerificationCode,
    isLoading,
    onSubmit,
    requiresLegalConsent,
    setAgreedToLegal,
    setVerificationCode,
    status,
    turnstile,
    turnstileWidgetKey,
    verificationCode,
  } = state

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem className='gap-[6px]'>
              <label
                className='text-base leading-5 text-white'
                htmlFor='linkai-register-username'
              >
                {t('Username')}
              </label>
              <FormControl>
                <input
                  id='linkai-register-username'
                  autoComplete='username'
                  placeholder={t('Enter your username')}
                  className={INPUT_CLASS}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='gap-[6px]'>
              <label
                className='block text-base leading-5 text-white'
                htmlFor='linkai-register-password'
              >
                {t('Password')}
              </label>
              <FormControl>
                <input
                  id='linkai-register-password'
                  type='password'
                  autoComplete='new-password'
                  placeholder={t('Enter password (8-20 characters)')}
                  className={INPUT_CLASS}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem className='gap-[6px]'>
              <label
                className='block text-base leading-5 text-white'
                htmlFor='linkai-register-confirm-password'
              >
                {t('Confirm password')}
              </label>
              <FormControl>
                <input
                  id='linkai-register-confirm-password'
                  type='password'
                  autoComplete='new-password'
                  placeholder={t('Confirm password')}
                  className={INPUT_CLASS}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {emailVerificationRequired && (
          <>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='gap-[6px]'>
                  <label
                    className='text-base leading-5 text-white'
                    htmlFor='linkai-register-email'
                  >
                    {t('Enter email address')}
                  </label>
                  <FormControl>
                    <input
                      id='linkai-register-email'
                      type='email'
                      autoComplete='email'
                      placeholder={t('Enter email address')}
                      className={INPUT_CLASS}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex gap-2'>
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder={t('Verification code')}
                aria-label={t('Verification code')}
                className='h-[46px] min-w-0 flex-1 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-6 text-sm text-white outline-none focus:border-[#7258ce]'
              />
              <button
                type='button'
                disabled={
                  emailVerification.isSending ||
                  emailVerification.isActive ||
                  !email
                }
                onClick={() => void handleSendVerificationCode()}
                className='rounded-full border border-[#37373d] px-5 text-sm text-white disabled:opacity-50'
              >
                {emailVerification.isActive
                  ? t('Resend ({{seconds}}s)', {
                      seconds: emailVerification.secondsLeft,
                    })
                  : t('Send code')}
              </button>
            </div>
          </>
        )}

        {turnstile.isTurnstileEnabled && (
          <Turnstile
            key={turnstileWidgetKey}
            siteKey={turnstile.turnstileSiteKey}
            onVerify={turnstile.setTurnstileToken}
            onExpire={() => turnstile.setTurnstileToken('')}
          />
        )}

        {requiresLegalConsent && (
          <LinkAiLegalConsent
            id='linkai-sign-up-legal-consent'
            status={status}
            checked={agreedToLegal}
            onCheckedChange={setAgreedToLegal}
          />
        )}

        <button
          type='submit'
          disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
          className='flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#e5e5e5] text-base font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
          {t('Create account')}
        </button>
      </form>
    </Form>
  )
}
