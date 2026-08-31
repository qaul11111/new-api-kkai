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
import { useEffect, useRef, useState } from 'react'

import type { TelegramAuthPayload } from '../types'

// The official widget script evaluates the `data-onauth` attribute as JS in
// the page context, so each instance registers a uniquely named global
// callback and lets the script invoke `name(user)`.
let widgetCallbackSeq = 0

const TELEGRAM_WIDGET_SCRIPT = 'https://telegram.org/js/telegram-widget.js?22'

type TelegramLoginWidgetProps = {
  botName: string
  onAuth: (payload: TelegramAuthPayload) => void
  size?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: boolean
  className?: string
}

/**
 * React 19-compatible loader for the official Telegram login widget.
 * Injects the widget script into a local container and forwards the
 * authorization payload through `onAuth`.
 */
export function TelegramLoginWidget({
  botName,
  onAuth,
  size = 'large',
  cornerRadius,
  requestAccess = true,
  className,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onAuthRef = useRef(onAuth)
  const [callbackName] = useState(
    () => `__telegramWidgetOnAuth${++widgetCallbackSeq}`
  )

  useEffect(() => {
    onAuthRef.current = onAuth
  }, [onAuth])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !botName) return

    const globalScope = window as unknown as Record<string, unknown>
    globalScope[callbackName] = (user: TelegramAuthPayload) => {
      onAuthRef.current(user)
    }

    const script = document.createElement('script')
    script.src = TELEGRAM_WIDGET_SCRIPT
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', size)
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    if (cornerRadius !== undefined) {
      script.setAttribute('data-radius', String(cornerRadius))
    }
    if (requestAccess) {
      script.setAttribute('data-request-access', 'write')
    }
    container.appendChild(script)

    return () => {
      delete globalScope[callbackName]
      container.replaceChildren()
    }
  }, [botName, size, cornerRadius, requestAccess, callbackName])

  if (!botName) return null

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid='telegram-login-widget'
    />
  )
}
