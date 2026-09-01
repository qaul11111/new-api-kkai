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
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { register, wechatLoginByCode } from '@/features/auth/api'
import { resolveWeChatQrCodeUrl } from '@/features/auth/components/wechat-qr-code'
import { registerFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useOAuthLogin } from '@/features/auth/hooks/use-oauth-login'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'
import type { TelegramAuthPayload } from '@/features/auth/types'
import { useStatus } from '@/hooks/use-status'

export type LinkAiSignUpFields = z.infer<typeof registerFormSchema>

export function useLinkAiSignUp() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const oauth = useOAuthLogin(status)
  const { redirectToLogin, handleLoginSuccess } = useAuthRedirect()
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const weChatSubmittingRef = useRef(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const turnstile = useTurnstile()
  const emailVerification = useEmailVerification({
    turnstileToken: turnstile.turnstileToken,
    validateTurnstile: turnstile.validateTurnstile,
  })
  const form = useForm<LinkAiSignUpFields>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const email = useWatch({ control: form.control, name: 'email' })
  const emailVerificationRequired = Boolean(status?.email_verification)
  const registerEnabled = status?.register_enabled !== false
  const passwordRegistrationEnabled =
    (status?.password_register_enabled ??
      status?.data?.password_register_enabled ??
      true) !== false
  const oauthRegistrationEnabled =
    (status?.oauth_register_enabled ??
      status?.data?.oauth_register_enabled ??
      true) !== false
  const requiresLegalConsent = Boolean(
    status?.user_agreement_enabled || status?.privacy_policy_enabled
  )
  const telegramBotName =
    typeof status?.telegram_bot_name === 'string'
      ? status.telegram_bot_name
      : ''
  const telegramLoginEnabled = Boolean(
    status?.telegram_oauth && telegramBotName
  )
  const wechatQrCodeUrl = resolveWeChatQrCodeUrl(status)

  useEffect(() => {
    const affiliateCode = new URLSearchParams(window.location.search)
      .get('aff')
      ?.trim()
    if (affiliateCode) saveAffiliateCode(affiliateCode)
  }, [])

  const resetTurnstile = () => {
    if (!turnstile.isTurnstileEnabled) return
    turnstile.setTurnstileToken('')
    setTurnstileWidgetKey((current) => current + 1)
  }

  const guardAuthAction = (action: () => void | Promise<void>) => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    void action()
  }

  async function handleSendVerificationCode() {
    const sent = await emailVerification.sendCode(email ?? '')
    if (sent) resetTurnstile()
  }

  function handleOpenWeChatDialog() {
    setIsWeChatDialogOpen(true)
  }

  async function handleWeChatLogin(code: string) {
    // Synchronous re-entry guard: two submissions in the same tick must not
    // both reach the backend before the disabled state can propagate.
    if (weChatSubmittingRef.current) return
    weChatSubmittingRef.current = true
    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(code)
      if (res?.success) {
        await handleLoginSuccess(res.data as { id?: number } | null)
        toast.success(t('Signed in via WeChat'))
        setIsWeChatDialogOpen(false)
      } else {
        toast.error(res?.message || t('Login failed'))
      }
    } catch {
      toast.error(t('Login failed'))
    } finally {
      weChatSubmittingRef.current = false
      setIsWeChatSubmitting(false)
    }
  }

  function handleTelegramAuth(payload: TelegramAuthPayload) {
    guardAuthAction(() => oauth.handleTelegramAuth(payload))
  }

  async function onSubmit(data: LinkAiSignUpFields) {
    if (!registerEnabled || !passwordRegistrationEnabled) {
      toast.info(t('Registration is currently disabled'))
      return
    }
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    if (emailVerificationRequired) {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        toast.error(t('Please enter a valid email address'))
        return
      }
      if (!verificationCode.trim()) {
        toast.error(t('Please enter the verification code'))
        return
      }
    }
    if (!turnstile.validateTurnstile()) return

    const submittedTurnstileToken = turnstile.turnstileToken
    resetTurnstile()
    setIsLoading(true)
    try {
      const response = await register({
        username: data.username,
        password: data.password,
        email: emailVerificationRequired ? data.email || undefined : undefined,
        verification_code: emailVerificationRequired
          ? verificationCode || undefined
          : undefined,
        aff_code: getAffiliateCode(),
        turnstile: submittedTurnstileToken,
      })
      if (response?.success) {
        toast.success(t('Account created! Please sign in'))
        redirectToLogin()
      } else {
        toast.error(response?.message || t('Failed to create account'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    agreedToLegal,
    email,
    emailVerification,
    emailVerificationRequired,
    form,
    guardAuthAction,
    handleOpenWeChatDialog,
    handleSendVerificationCode,
    handleTelegramAuth,
    handleWeChatLogin,
    isLoading,
    isWeChatDialogOpen,
    isWeChatSubmitting,
    oauth,
    oauthRegistrationEnabled,
    onSubmit,
    passwordRegistrationEnabled,
    registerEnabled,
    requiresLegalConsent,
    setAgreedToLegal,
    setIsWeChatDialogOpen,
    setVerificationCode,
    status,
    telegramBotName,
    telegramLoginEnabled,
    turnstile,
    turnstileWidgetKey,
    verificationCode,
    wechatQrCodeUrl,
  }
}

export type LinkAiSignUpState = ReturnType<typeof useLinkAiSignUp>
