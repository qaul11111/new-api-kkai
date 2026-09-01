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

import { Route as consoleIndexRoute } from '../console'
import { Route as consoleChatRoute } from '../console/chat/$id'
import { Route as consoleChatIndexRoute } from '../console/chat/index'
import { Route as consoleLogRoute } from '../console/log'
import { Route as consoleMidjourneyRoute } from '../console/midjourney'
import { Route as consolePersonalRoute } from '../console/personal'
import { Route as consolePlaygroundRoute } from '../console/playground'
import { Route as consoleTaskRoute } from '../console/task'
import { Route as consoleTokenRoute } from '../console/token'
import { Route as consoleTopupRoute } from '../console/topup'

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

async function runCompatRoute(
  route: unknown,
  rawSearch: Record<string, unknown>,
  params?: Record<string, string>
): Promise<CapturedRedirect | null> {
  const search = runValidateSearch(
    routeOptions(route).validateSearch,
    rawSearch
  )
  return captureRedirect(route, { search, params: params ?? {} })
}

describe('/console legacy redirect', () => {
  test('redirects to the dashboard overview section', async () => {
    const res = await runCompatRoute(consoleIndexRoute, {})
    assert.equal(res?.options.to, '/dashboard/$section')
    assert.deepEqual(res?.options.params, { section: 'overview' })
    assert.equal(res?.options.replace, true)
  })
})

describe('/console/token legacy redirect', () => {
  test('redirects to /keys preserving query params', async () => {
    const res = await runCompatRoute(consoleTokenRoute, { filter: 'prod' })
    assert.equal(res?.options.to, '/keys')
    assert.equal(res?.options.replace, true)
    assert.deepEqual(res?.options.search, { filter: 'prod' })
  })
})

describe('/console/playground legacy redirect', () => {
  test('redirects to /playground preserving query params', async () => {
    const res = await runCompatRoute(consolePlaygroundRoute, {
      model: 'gpt-4o',
    })
    assert.equal(res?.options.to, '/playground')
    assert.equal(res?.options.replace, true)
    assert.deepEqual(res?.options.search, { model: 'gpt-4o' })
  })
})

describe('/console/personal legacy redirect', () => {
  test('redirects to /profile', async () => {
    const res = await runCompatRoute(consolePersonalRoute, {})
    assert.equal(res?.options.to, '/profile')
    assert.equal(res?.options.replace, true)
  })
})

describe('/console/log legacy redirect', () => {
  test('redirects to the common usage-logs section', async () => {
    const res = await runCompatRoute(consoleLogRoute, {})
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'common' })
    assert.equal(res?.options.replace, true)
  })

  test('preserves legacy log filters in the query', async () => {
    const res = await runCompatRoute(consoleLogRoute, {
      type: '2',
      model: 'gpt-4o',
    })
    assert.deepEqual(res?.options.search, { type: '2', model: 'gpt-4o' })
  })
})

describe('/console/midjourney legacy redirect', () => {
  test('redirects to the drawing usage-logs section', async () => {
    const res = await runCompatRoute(consoleMidjourneyRoute, {})
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'drawing' })
    assert.equal(res?.options.replace, true)
  })
})

describe('/console/task legacy redirect', () => {
  test('redirects to the task usage-logs section', async () => {
    const res = await runCompatRoute(consoleTaskRoute, {})
    assert.equal(res?.options.to, '/usage-logs/$section')
    assert.deepEqual(res?.options.params, { section: 'task' })
    assert.equal(res?.options.replace, true)
  })
})

describe('/console/topup legacy redirect', () => {
  test('redirects to /wallet with the history view open', async () => {
    const res = await runCompatRoute(consoleTopupRoute, {})
    assert.equal(res?.options.to, '/wallet')
    assert.deepEqual(res?.options.search, { show_history: true })
  })

  test('preserves payment return query params', async () => {
    const res = await runCompatRoute(consoleTopupRoute, {
      order_id: 'ORDER-1',
      amount: '50',
    })
    assert.equal(res?.options.to, '/wallet')
    assert.equal(res?.options.replace, true)
    assert.deepEqual(res?.options.search, {
      show_history: true,
      order_id: 'ORDER-1',
      amount: '50',
    })
  })
})

describe('/console/chat/:id legacy redirect', () => {
  test('redirects to /chat/:id keeping the preset id and query params', async () => {
    const res = await runCompatRoute(
      consoleChatRoute,
      { foo: 'bar' },
      { id: '3' }
    )
    assert.equal(res?.options.to, '/chat/$chatId')
    assert.deepEqual(res?.options.params, { chatId: '3' })
    assert.equal(res?.options.replace, true)
    assert.deepEqual(res?.options.search, { foo: 'bar' })
  })
})

describe('/console/chat legacy redirect without id', () => {
  test('redirects to the dashboard overview section', async () => {
    const res = await runCompatRoute(consoleChatIndexRoute, {})
    assert.equal(res?.options.to, '/dashboard/$section')
    assert.deepEqual(res?.options.params, { section: 'overview' })
    assert.equal(res?.options.replace, true)
  })
})
