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
import type { AxiosRequestConfig } from 'axios'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccountType } from '@/lib/account-type'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { getOAuthState, telegramLogin } from '../api'
import {
  buildGitHubOAuthUrl,
  buildDiscordOAuthUrl,
  buildOIDCOAuthUrl,
  buildLinuxDOOAuthUrl,
} from '../lib/oauth'
import type {
  SystemStatus,
  CustomOAuthProviderInfo,
  TelegramAuthPayload,
} from '../types'
import { useAuthRedirect } from './use-auth-redirect'

type LogoutRequestConfig = AxiosRequestConfig & {
  skipErrorHandler?: boolean
}

/**
 * Hook for managing OAuth login
 */
export function useOAuthLogin(
  status: SystemStatus | null,
  options?: { accountType?: AccountType }
) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isTelegramLoading, setIsTelegramLoading] = useState(false)
  const defaultGithubButtonText = t('Continue with GitHub')
  const [githubButtonTextOverride, setGithubButtonTextOverride] = useState<
    string | null
  >(null)
  const githubButtonText = githubButtonTextOverride ?? defaultGithubButtonText
  const [githubButtonDisabled, setGithubButtonDisabled] = useState(false)
  const githubTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { auth } = useAuthStore()
  const { handleLoginSuccess } = useAuthRedirect()

  useEffect(() => {
    return () => {
      if (githubTimeoutRef.current) {
        clearTimeout(githubTimeoutRef.current)
      }
    }
  }, [])

  const resetSession = async () => {
    try {
      auth.reset()
    } catch {
      // ignore store reset errors
    }
    try {
      await api.get('/api/user/logout', {
        skipErrorHandler: true,
      } as LogoutRequestConfig)
    } catch {
      // ignore logout errors
    }
  }

  const handleGitHubLogin = async () => {
    if (!status?.github_client_id) return
    if (githubButtonDisabled) return

    setIsLoading(true)
    setGithubButtonDisabled(true)
    setGithubButtonTextOverride(t('Redirecting to GitHub...'))

    if (githubTimeoutRef.current) {
      clearTimeout(githubTimeoutRef.current)
    }

    githubTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      setGithubButtonTextOverride(
        t('Request timed out, please refresh and restart GitHub login')
      )
      setGithubButtonDisabled(true)
    }, 20000)

    try {
      await resetSession()
      const state = await getOAuthState(options?.accountType)
      if (!state) {
        toast.error(t('Failed to initialize OAuth'))
        if (githubTimeoutRef.current) {
          clearTimeout(githubTimeoutRef.current)
        }
        setIsLoading(false)
        setGithubButtonTextOverride(null)
        setGithubButtonDisabled(false)
        return
      }

      const url = buildGitHubOAuthUrl(status.github_client_id, state)
      window.open(url, '_self')
    } catch {
      toast.error(t('Failed to start GitHub login'))
      if (githubTimeoutRef.current) {
        clearTimeout(githubTimeoutRef.current)
      }
      setIsLoading(false)
      setGithubButtonTextOverride(null)
      setGithubButtonDisabled(false)
    }
  }

  const handleDiscordLogin = async () => {
    if (!status?.discord_client_id) return

    setIsLoading(true)
    try {
      await resetSession()
      const state = await getOAuthState(options?.accountType)
      if (!state) {
        toast.error(t('Failed to initialize OAuth'))
        return
      }

      const url = buildDiscordOAuthUrl(status.discord_client_id, state)
      window.open(url, '_self')
    } catch {
      toast.error(t('Failed to start Discord login'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOIDCLogin = async () => {
    if (!status?.oidc_authorization_endpoint || !status?.oidc_client_id) return

    setIsLoading(true)
    try {
      await resetSession()
      const state = await getOAuthState(options?.accountType)
      if (!state) {
        toast.error(t('Failed to initialize OAuth'))
        return
      }

      const url = buildOIDCOAuthUrl(
        status.oidc_authorization_endpoint,
        status.oidc_client_id,
        state
      )
      window.open(url, '_self')
    } catch {
      toast.error(t('Failed to start OIDC login'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinuxDOLogin = async () => {
    if (!status?.linuxdo_client_id) return

    setIsLoading(true)
    try {
      await resetSession()
      const state = await getOAuthState(options?.accountType)
      if (!state) {
        toast.error(t('Failed to initialize OAuth'))
        return
      }

      const url = buildLinuxDOOAuthUrl(status.linuxdo_client_id, state)
      window.open(url, '_self')
    } catch {
      toast.error(t('Failed to start LinuxDO login'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleTelegramAuth = async (
    payload: TelegramAuthPayload,
    redirectTo?: string
  ) => {
    if (isTelegramLoading) return
    if (!payload?.hash || !payload?.id) {
      toast.error(t('Login failed'))
      return
    }

    setIsTelegramLoading(true)
    try {
      const res = await telegramLogin(payload)
      if (res?.success) {
        await handleLoginSuccess(res.data as { id?: number } | null, redirectTo)
        toast.success(
          t('Logged in successfully via {{method}}', { method: 'Telegram' })
        )
      } else {
        toast.error(res?.message || t('Login failed'))
      }
    } catch {
      // Errors are handled by global interceptor
    } finally {
      setIsTelegramLoading(false)
    }
  }

  const handleCustomOAuthLogin = async (provider: CustomOAuthProviderInfo) => {
    if (!provider.authorization_endpoint || !provider.client_id) return

    setIsLoading(true)
    try {
      await resetSession()
      const state = await getOAuthState(options?.accountType)
      if (!state) {
        toast.error(t('Failed to initialize OAuth'))
        return
      }

      const redirectUri = `${window.location.origin}/oauth/${provider.slug}`
      const url = new URL(provider.authorization_endpoint)
      url.searchParams.set('client_id', provider.client_id)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('state', state)
      if (provider.scopes) {
        url.searchParams.set('scope', provider.scopes)
      }

      window.open(url.toString(), '_self')
    } catch {
      toast.error(
        t('Failed to start {{provider}} login', { provider: provider.name })
      )
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    isTelegramLoading,
    githubButtonText,
    githubButtonDisabled,
    handleGitHubLogin,
    handleDiscordLogin,
    handleOIDCLogin,
    handleLinuxDOLogin,
    handleTelegramAuth,
    handleCustomOAuthLogin,
  }
}
