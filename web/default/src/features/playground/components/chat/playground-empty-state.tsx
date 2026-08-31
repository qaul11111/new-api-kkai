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
import {
  BarChartIcon,
  CodeSquareIcon,
  GraduationCapIcon,
  MessageSquarePlusIcon,
  NotepadTextIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type PlaygroundEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void
}

const starterPrompts = [
  { icon: BarChartIcon, text: 'Analyze data' },
  { icon: NotepadTextIcon, text: 'Summarize text' },
  { icon: CodeSquareIcon, text: 'Code' },
  { icon: GraduationCapIcon, text: 'Get advice' },
]

export function PlaygroundEmptyState({
  onSelectPrompt,
}: PlaygroundEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className='flex min-h-[min(28rem,calc(100svh-22rem))] items-start justify-start px-1 py-5'>
      <div className='grid w-full max-w-2xl gap-5 text-left'>
        <div className='flex w-fit max-w-full items-center gap-3 rounded-[26px] bg-[#262626] px-5 py-3 text-[#eeeeee]'>
          <MessageSquarePlusIcon className='size-5' aria-hidden='true' />
          <div className='min-w-0'>
            <h2 className='text-sm font-medium sm:text-base'>
              {t('Start a playground chat')}
            </h2>
            <p className='mt-1 text-xs leading-5 text-[#a1a1a1] sm:text-sm'>
              {t(
                'Test a model with a starter prompt, or write your own request below.'
              )}
            </p>
          </div>
        </div>

        <div className='grid max-w-xl gap-2 sm:grid-cols-2'>
          {starterPrompts.map(({ icon: Icon, text }) => {
            const prompt = t(text)

            return (
              <Button
                className='h-auto min-h-11 justify-start gap-2 rounded-xl border-[#343434] bg-[#171717] px-3 py-2.5 text-left whitespace-normal text-[#a1a1a1] hover:bg-[#262626] hover:text-white'
                key={text}
                onClick={() => onSelectPrompt(prompt)}
                variant='outline'
              >
                <Icon className='text-muted-foreground size-4' />
                <span>{prompt}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
