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
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Playground } from './index'

const mocks = vi.hoisted(() => ({
  useChatHandler: vi.fn(),
  usePlaygroundConversation: vi.fn(),
  usePlaygroundOptions: vi.fn(),
  usePlaygroundState: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (icon: string) => <svg data-icon={icon} />,
}))

vi.mock('./hooks', () => mocks)

vi.mock('./components/chat/playground-chat', () => ({
  PlaygroundChat: (props: { sourceView?: boolean }) => (
    <div data-source-view={String(props.sourceView)} data-testid='chat-view' />
  ),
}))

vi.mock('./components/input/playground-input', () => ({
  PlaygroundInput: () => <div data-testid='playground-input' />,
}))

describe('Playground LinkAI layout', () => {
  beforeEach(() => {
    mocks.usePlaygroundState.mockReturnValue({
      clearMessages: vi.fn(),
      config: {
        frequency_penalty: 0,
        group: 'default',
        max_tokens: 4096,
        model: 'claude-opus-5',
        presence_penalty: 0,
        seed: null,
        stream: true,
        temperature: 0.7,
        top_p: 1,
      },
      groups: [{ label: 'Default', ratio: 1, value: 'default' }],
      isLoadingMessages: false,
      messages: [],
      models: [{ label: 'Claude Opus 5', value: 'claude-opus-5' }],
      parameterEnabled: {
        frequency_penalty: true,
        max_tokens: false,
        presence_penalty: true,
        seed: false,
        temperature: true,
        top_p: true,
      },
      setGroups: vi.fn(),
      setModels: vi.fn(),
      updateConfig: vi.fn(),
      updateMessages: vi.fn(),
      updateParameterEnabled: vi.fn(),
    })
    mocks.useChatHandler.mockReturnValue({
      isGenerating: false,
      sendChat: vi.fn(),
      stopGeneration: vi.fn(),
    })
    mocks.usePlaygroundConversation.mockReturnValue({
      applyEdit: vi.fn(),
      editingMessageKey: null,
      handleDeleteMessage: vi.fn(),
      handleEditMessage: vi.fn(),
      handleEditOpenChange: vi.fn(),
      handleRegenerateMessage: vi.fn(),
      handleSendMessage: vi.fn(),
    })
    mocks.usePlaygroundOptions.mockReturnValue({ isLoadingModels: false })
  })

  it('uses the selected model and switches the real conversation source view', () => {
    const { container } = render(<Playground />)

    expect(
      screen.getByRole('heading', { name: 'Claude Opus 5' })
    ).toBeInTheDocument()
    expect(screen.getByTitle('Claude')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('playground-input')).toBeInTheDocument()

    const conversationTab = screen.getByRole('tab', {
      name: 'Conversation View',
    })
    const codeTab = screen.getByRole('tab', { name: 'Code View' })

    expect(conversationTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('chat-view')).toHaveAttribute(
      'data-source-view',
      'false'
    )

    fireEvent.click(codeTab)

    expect(codeTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('chat-view')).toHaveAttribute(
      'data-source-view',
      'true'
    )
  })
})
