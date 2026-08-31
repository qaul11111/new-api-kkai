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
import assert from 'node:assert/strict'

import { isRedirect } from '@tanstack/react-router'
import { describe, test } from 'vitest'

import { Route as loginRoute } from '../(auth)/login'
import { Route as registerRoute } from '../(auth)/register'
import { Route as resetRoute } from '../(auth)/reset'
import { Route as userResetRoute } from '../(auth)/user/reset'
import { Route as forbiddenRoute } from '../(errors)/forbidden'

type CapturedRedirect = {
  options: {
    to?: string
    params?: Record<string, string>
    search?: unknown
    replace?: boolean
  }
}

type CompatRouteLike = {
  options: {
    beforeLoad?: unknown
    validateSearch?: unknown
    component?: unknown
  }
}

function routeOptions(route: unknown): CompatRouteLike['options'] {
  return (route as CompatRouteLike).options
}

/**
 * Route options store validateSearch exactly as declared: either a function
 * or a schema object (zod). Run whichever shape the route declared.
 */
function runValidateSearch(validateSearch: unknown, raw: unknown): unknown {
  if (!validateSearch) return raw
  if (typeof validateSearch === 'function') return validateSearch(raw)
  const schema = validateSearch as { parse?: (input: unknown) => unknown }
  if (typeof schema.parse === 'function') return schema.parse(raw)
  throw new Error('Unsupported validateSearch shape')
}

/**
 * Drive a route's validateSearch + beforeLoad the way the router would and
 * capture a thrown redirect instead of letting it propagate.
 */
async function captureRedirect(
  route: unknown,
  args: Record<string, unknown>
): Promise<CapturedRedirect | null> {
  const beforeLoad = routeOptions(route).beforeLoad as
    | ((args: Record<string, unknown>) => unknown)
    | undefined
  if (!beforeLoad) return null
  try {
    await beforeLoad(args)
    return null
  } catch (err) {
    if (isRedirect(err)) return err as unknown as CapturedRedirect
    throw err
  }
}

function validatedSearch(
  route: unknown,
  rawSearch: Record<string, unknown>
): unknown {
  return runValidateSearch(routeOptions(route).validateSearch, rawSearch)
}

describe('/login legacy redirect', () => {
  test('redirects to /sign-in with a history replace', async () => {
    const res = await captureRedirect(loginRoute, {
      search: validatedSearch(loginRoute, {}),
    })
    assert.equal(res?.options.to, '/sign-in')
    assert.equal(res?.options.replace, true)
  })

  test('preserves the sign-in redirect query param', async () => {
    const res = await captureRedirect(loginRoute, {
      search: validatedSearch(loginRoute, { redirect: '/dashboard/overview' }),
    })
    assert.equal(res?.options.to, '/sign-in')
    assert.deepEqual(res?.options.search, { redirect: '/dashboard/overview' })
  })
})

describe('/register legacy redirect', () => {
  test('redirects to /sign-up keeping affiliate and redirect query params', async () => {
    const res = await captureRedirect(registerRoute, {
      location: { search: { aff: 'CODE123', redirect: '/pricing' } },
    })
    assert.equal(res?.options.to, '/sign-up')
    assert.equal(res?.options.replace, true)
    assert.deepEqual(res?.options.search, {
      aff: 'CODE123',
      redirect: '/pricing',
    })
  })
})

describe('/reset legacy entry point', () => {
  test('renders the confirmation page when email and token are present', async () => {
    const search = validatedSearch(resetRoute, {
      email: 'user@example.com',
      token: 'abc123',
    }) as { email?: string; token?: string }
    assert.equal(search.email, 'user@example.com')
    assert.equal(search.token, 'abc123')
    const res = await captureRedirect(resetRoute, { search })
    assert.equal(res, null)
    assert.equal(typeof routeOptions(resetRoute).component, 'function')
  })

  test('redirects to /forgot-password when the confirmation pair is incomplete', async () => {
    const incompletePairs: Record<string, unknown>[] = [
      {},
      { email: 'user@example.com' },
      { token: 'abc123' },
      { email: '', token: 'abc123' },
      { email: 'user@example.com', token: '' },
    ]
    for (const raw of incompletePairs) {
      const search = validatedSearch(resetRoute, raw)
      const res = await captureRedirect(resetRoute, { search })
      assert.equal(
        res?.options.to,
        '/forgot-password',
        `expected redirect for ${JSON.stringify(raw)}`
      )
      assert.equal(res?.options.replace, true)
    }
  })

  test('drops malformed search values instead of crashing', async () => {
    const search = validatedSearch(resetRoute, {
      email: 42,
      token: 'abc123',
    }) as { email?: string }
    assert.equal(search.email, undefined)
  })
})

describe('/user/reset confirmation', () => {
  test('keeps rendering the confirmation page without a redirect guard', async () => {
    const res = await captureRedirect(userResetRoute, {
      search: { email: 'user@example.com', token: 'abc123' },
    })
    assert.equal(res, null)
    assert.equal(typeof routeOptions(userResetRoute).component, 'function')
  })
})

describe('/forbidden legacy redirect', () => {
  test('redirects to /403 with a history replace', async () => {
    const res = await captureRedirect(forbiddenRoute, {})
    assert.equal(res?.options.to, '/403')
    assert.equal(res?.options.replace, true)
  })
})
