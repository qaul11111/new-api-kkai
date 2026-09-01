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
import { describe, expect, it } from 'vitest'

import { usesLinkAiConsoleShell } from './route-matcher'

describe('usesLinkAiConsoleShell', () => {
  it.each([
    '/dashboard',
    '/keys',
    '/playground',
    '/chat/preset',
    '/chat2link',
    '/usage-logs/common',
    '/group-status',
    '/wallet',
    '/profile',
    '/invitations',
    '/image-studio/create',
    '/video-studio/create',
    '/chat2link/',
  ])('uses the LinkAI shell for user route %s', (pathname) => {
    expect(usesLinkAiConsoleShell(pathname)).toBe(true)
  })

  it.each([
    '/dashboard/users',
    '/invitations/admin',
    '/channels',
    '/models/metadata',
    '/users',
    '/redemption-codes',
    '/subscriptions',
    '/system-info',
    '/system-settings/site',
    '/chat2link-extra',
    '/dashboarding',
    '/unknown',
  ])('keeps the original shell for admin route %s', (pathname) => {
    expect(usesLinkAiConsoleShell(pathname)).toBe(false)
  })
})
