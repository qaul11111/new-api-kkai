/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'

const ASSET_ROOT = '/figma/linkai-console/dashboard'

type SummaryAction = {
  label: string
  to: '/usage-logs/$section' | '/wallet'
}

type SummaryCardProps = {
  action?: SummaryAction
  description: string
  icon: 'balance' | 'consumption' | 'requests'
  title: string
  value: string
}

export function SummaryCard(props: SummaryCardProps) {
  return (
    <article className='flex min-h-[clamp(168px,10.94vw,210px)] flex-col rounded-xl border border-[#191919] bg-[#0a0a0a] p-[clamp(18px,1.25vw,24px)]'>
      <div className='flex items-start justify-between gap-4'>
        <h2 className='pt-1 text-[clamp(14px,0.94vw,18px)] text-white/80'>
          {props.title}
        </h2>
        <img
          src={`${ASSET_ROOT}/${props.icon}.png`}
          alt=''
          className='size-[clamp(42px,2.66vw,51px)] shrink-0 object-contain'
        />
      </div>

      <div className='mt-auto flex items-end justify-between gap-4'>
        <div className='min-w-0'>
          <p className='truncate text-[clamp(24px,1.67vw,32px)] leading-none font-normal tracking-[-0.03em] text-white'>
            {props.value}
          </p>
          <p className='mt-[clamp(10px,0.78vw,15px)] truncate text-[clamp(11px,0.73vw,14px)] text-[#454545]'>
            {props.description}
          </p>
        </div>
        {props.action &&
          (props.action.to === '/wallet' ? (
            <SummaryLink to='/wallet' label={props.action.label} />
          ) : (
            <SummaryLink
              to='/usage-logs/$section'
              params={{ section: 'common' }}
              label={props.action.label}
            />
          ))}
      </div>
    </article>
  )
}

function SummaryLink(
  props:
    | { label: string; to: '/wallet'; params?: never }
    | {
        label: string
        to: '/usage-logs/$section'
        params: { section: 'common' }
      }
) {
  const content = (
    <>
      {props.label}
      <img
        src={`${ASSET_ROOT}/arrow-right.png`}
        alt=''
        className='size-3.5 opacity-55 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100'
      />
    </>
  )
  const className =
    'group flex shrink-0 items-center gap-1 rounded-full border border-[#191919] px-3 py-2 text-[clamp(10px,0.68vw,13px)] text-[#777] transition-colors hover:border-white/20 hover:text-white'

  if (props.to === '/wallet') {
    return (
      <Link to='/wallet' className={className}>
        {content}
      </Link>
    )
  }

  return (
    <Link to='/usage-logs/$section' params={props.params} className={className}>
      {content}
    </Link>
  )
}

type TodayCardProps = {
  icon: 'today-consumption' | 'today-requests' | 'today-tokens'
  label: string
  todayLabel: string
  value: string
}

export function TodayCard(props: TodayCardProps) {
  return (
    <article className='flex min-h-[clamp(112px,7.08vw,136px)] items-center gap-[clamp(16px,1.25vw,24px)] rounded-xl border border-[#191919] bg-[#0a0a0a] p-[clamp(18px,1.25vw,24px)]'>
      <img
        src={`${ASSET_ROOT}/${props.icon}.png`}
        alt=''
        className='size-[clamp(52px,3.23vw,62px)] shrink-0 object-contain'
      />
      <div className='min-w-0'>
        <p className='text-[clamp(11px,0.73vw,14px)] text-[#454545]'>
          {props.todayLabel}
        </p>
        <p className='mt-0.5 text-[clamp(12px,0.78vw,15px)] text-[#777]'>
          {props.label}
        </p>
        <p className='mt-1 truncate text-[clamp(22px,1.56vw,30px)] leading-none text-white'>
          {props.value}
        </p>
      </div>
    </article>
  )
}
