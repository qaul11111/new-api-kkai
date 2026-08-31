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

import type { PricingModel } from '../types'
import { ModelDetailsApi } from './model-details-api'

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: null, loading: false, error: null }),
}))

function makeModel(overrides: Partial<PricingModel>): PricingModel {
  return {
    id: 1,
    model_name: 'gpt-4o-mini',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 2,
    enable_groups: ['default', 'vip'],
    supported_endpoint_types: ['openai'],
    ...overrides,
  }
}

const CHAT_ENDPOINT_MAP = {
  openai: { path: '/v1/chat/completions', method: 'POST' },
}

describe('ModelDetailsApi', () => {
  test('renders real code samples and authentication guidance', () => {
    render(
      <ModelDetailsApi model={makeModel({})} endpointMap={CHAT_ENDPOINT_MAP} />
    )

    expect(screen.getByText('Code samples')).toBeInTheDocument()
    expect(screen.getByText('Authentication')).toBeInTheDocument()
    expect(screen.getByText(/All requests must include/)).toBeInTheDocument()
  })

  test.each([
    ['chat', 'gpt-4o-mini'],
    ['reasoning', 'o3-mini'],
    ['embedding', 'text-embedding-3-large'],
    ['image', 'dall-e-3'],
    ['video', 'sora-2'],
  ])(
    'never renders inferred supported-parameter or rate-limit data (%s model)',
    (_label, modelName) => {
      render(
        <ModelDetailsApi
          model={makeModel({ model_name: modelName })}
          endpointMap={CHAT_ENDPOINT_MAP}
        />
      )

      expect(screen.queryByText('Supported parameters')).not.toBeInTheDocument()
      expect(screen.queryByText('Rate limits')).not.toBeInTheDocument()
      expect(screen.queryByText('RPM')).not.toBeInTheDocument()
      expect(screen.queryByText('TPM')).not.toBeInTheDocument()
      expect(screen.queryByText('RPD')).not.toBeInTheDocument()
      // Vocabulary that only existed in the removed mock tables.
      expect(
        screen.queryByText('Sampling temperature; lower is more deterministic')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText('Text description of the desired image')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Limits apply per token group/)
      ).not.toBeInTheDocument()
    }
  )

  test('still renders authentication when the model has no endpoints', () => {
    render(
      <ModelDetailsApi
        model={makeModel({ supported_endpoint_types: [] })}
        endpointMap={{}}
      />
    )

    expect(screen.queryByText('Code samples')).not.toBeInTheDocument()
    expect(screen.getByText('Authentication')).toBeInTheDocument()
    expect(screen.queryByText('Supported parameters')).not.toBeInTheDocument()
    expect(screen.queryByText('Rate limits')).not.toBeInTheDocument()
  })
})
