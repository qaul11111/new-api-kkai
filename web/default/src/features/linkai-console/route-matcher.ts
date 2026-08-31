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
const ADMIN_ROUTE_PREFIXES = [
  '/dashboard/users',
  '/invitations/admin',
  '/channels',
  '/models',
  '/users',
  '/redemption-codes',
  '/subscriptions',
  '/system-info',
  '/system-settings',
] as const

const LINKAI_CONSOLE_ROUTE_PREFIXES = [
  '/dashboard',
  '/keys',
  '/playground',
  '/chat',
  '/chat2link',
  '/usage-logs',
  '/group-status',
  '/wallet',
  '/profile',
  '/invitations',
  '/image-studio',
  '/video-studio',
] as const

function hasRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Resolves the visual shell without changing the route's auth guard. */
export function usesLinkAiConsoleShell(pathname: string): boolean {
  if (ADMIN_ROUTE_PREFIXES.some((prefix) => hasRoutePrefix(pathname, prefix))) {
    return false
  }

  return LINKAI_CONSOLE_ROUTE_PREFIXES.some((prefix) =>
    hasRoutePrefix(pathname, prefix)
  )
}
