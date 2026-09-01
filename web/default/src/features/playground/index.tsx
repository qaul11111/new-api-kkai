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
import { BotIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'
import { resolveModelProvider } from '@/lib/model-provider'
import { cn } from '@/lib/utils'

import { PlaygroundChat } from './components/chat/playground-chat'
import { PlaygroundInput } from './components/input/playground-input'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'

export function Playground() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'conversation' | 'code'>(
    'conversation'
  )
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })
  const selectedModelLabel =
    models.find((model) => model.value === config.model)?.label ||
    config.model ||
    t('Model')
  const selectedModelProvider = resolveModelProvider(config.model)

  return (
    <section
      className='relative flex size-full min-h-0 flex-col overflow-hidden bg-black text-white'
      data-testid='linkai-playground'
    >
      <div className='mx-auto w-full max-w-[72.25rem] shrink-0 px-4 pt-6 sm:px-6 sm:pt-8'>
        <div className='flex min-w-0 items-center gap-3'>
          <span
            aria-label={selectedModelProvider?.label || t('Model')}
            className='flex size-9 shrink-0 items-center justify-center text-[#eeeeee]'
            title={selectedModelProvider?.label || t('Model')}
          >
            {selectedModelProvider ? (
              getLobeIcon(selectedModelProvider.icon, 36)
            ) : (
              <BotIcon className='size-8' aria-hidden='true' />
            )}
          </span>
          <h1 className='min-w-0 truncate text-lg font-medium text-[#eeeeee] sm:text-xl'>
            {selectedModelLabel}
          </h1>
        </div>

        <div className='mt-7 flex w-full items-center sm:mt-8'>
          <div className='h-px min-w-4 flex-1 bg-white/10' aria-hidden='true' />
          <div
            aria-label={t('Playground')}
            className='flex shrink-0 items-center rounded-full border border-[#343434] bg-[#171717] p-1'
            role='tablist'
          >
            {(['conversation', 'code'] as const).map((mode) => {
              const isActive = viewMode === mode
              const label =
                mode === 'conversation'
                  ? t('Conversation View')
                  : t('Code View')

              return (
                <button
                  aria-selected={isActive}
                  className={cn(
                    'h-10 min-w-[7.5rem] rounded-full px-5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base',
                    isActive
                      ? 'bg-[#262626] text-[#eeeeee]'
                      : 'text-[#a1a1a1] hover:text-white'
                  )}
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  role='tab'
                  type='button'
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className='h-px min-w-4 flex-1 bg-white/10' aria-hidden='true' />
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <PlaygroundChat
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          onRegenerateMessage={handleRegenerateMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onSelectPrompt={handleSendMessage}
          isGenerating={isGenerating}
          editingKey={editingMessageKey}
          onCancelEdit={handleEditOpenChange}
          onSaveEdit={(newContent) => applyEdit(newContent, false)}
          onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
          sourceView={viewMode === 'code'}
        />
      </div>

      <div className='mx-auto w-full max-w-[72.25rem] shrink-0 px-4 pb-4 sm:px-6 sm:pb-5'>
        <PlaygroundInput
          config={config}
          disabled={isGenerating}
          groups={groups}
          groupValue={config.group}
          isGenerating={isGenerating}
          isModelLoading={isLoadingModels}
          modelValue={config.model}
          models={models}
          onGroupChange={(value) => updateConfig('group', value)}
          onConfigChange={updateConfig}
          onClearMessages={handleClearMessages}
          onModelChange={(value) => updateConfig('model', value)}
          onParameterEnabledChange={updateParameterEnabled}
          onStop={stopGeneration}
          onSubmit={handleSendMessage}
          parameterEnabled={parameterEnabled}
          hasMessages={messages.length > 0}
        />
      </div>
    </section>
  )
}
