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
import { describe, expect, test, vi } from 'vitest'

import type { TelegramAuthPayload } from '../types'
import { TelegramLoginWidget } from './telegram-login-widget'

function getWidgetScript(): HTMLScriptElement {
  const container = screen.getByTestId('telegram-login-widget')
  const script = container.querySelector('script')
  if (!script) throw new Error('Telegram widget script was not injected')
  return script
}

function invokeWidgetCallback(
  script: HTMLScriptElement,
  payload: TelegramAuthPayload
) {
  const onauth = script.getAttribute('data-onauth') ?? ''
  const match = onauth.match(/^([\w$]+)\(user\)$/)
  if (!match) throw new Error(`Unexpected data-onauth value: ${onauth}`)
  const callback = (window as unknown as Record<string, unknown>)[match[1]]
  if (typeof callback !== 'function') {
    throw new Error(`Global callback ${match[1]} was not registered`)
  }
  ;(callback as (user: TelegramAuthPayload) => void)(payload)
}

describe('TelegramLoginWidget', () => {
  test('injects the official widget script configured for the bot', () => {
    render(<TelegramLoginWidget botName='linkai_bot' onAuth={vi.fn()} />)

    const script = getWidgetScript()
    expect(script.src).toBe('https://telegram.org/js/telegram-widget.js?22')
    expect(script.async).toBe(true)
    expect(script.getAttribute('data-telegram-login')).toBe('linkai_bot')
    expect(script.getAttribute('data-size')).toBe('large')
    expect(script.getAttribute('data-request-access')).toBe('write')
    expect(script.getAttribute('data-onauth')).toMatch(/^\w+\(user\)$/)
  })

  test('forwards the Telegram authorization payload to onAuth', () => {
    const onAuth = vi.fn()
    render(<TelegramLoginWidget botName='linkai_bot' onAuth={onAuth} />)

    const payload: TelegramAuthPayload = {
      id: 12345,
      first_name: 'Ada',
      username: 'ada',
      auth_date: 1720000000,
      hash: 'deadbeef',
    }
    invokeWidgetCallback(getWidgetScript(), payload)

    expect(onAuth).toHaveBeenCalledTimes(1)
    expect(onAuth).toHaveBeenCalledWith(payload)
  })

  test('removes the global callback and widget on unmount', () => {
    const { unmount } = render(
      <TelegramLoginWidget botName='linkai_bot' onAuth={vi.fn()} />
    )
    const script = getWidgetScript()
    const onauth = script.getAttribute('data-onauth') ?? ''
    const callbackName = onauth.replace('(user)', '')

    unmount()

    expect(
      (window as unknown as Record<string, unknown>)[callbackName]
    ).toBeUndefined()
    expect(
      screen.queryByTestId('telegram-login-widget')
    ).not.toBeInTheDocument()
  })

  test('renders nothing without a configured bot name', () => {
    const { container } = render(
      <TelegramLoginWidget botName='' onAuth={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
