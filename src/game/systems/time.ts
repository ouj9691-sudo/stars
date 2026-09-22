import type { TimePhase } from '../types'

const PHASE_LABELS: Record<TimePhase, string> = {
  morning: '早晨',
  forenoon: '上午',
  afternoon: '下午',
  dusk: '傍晚',
  night: '夜晚',
}

/** 根据当天分钟数判断时间段 */
export function getTimePhase(time: number): TimePhase {
  if (time < 540) return 'morning' // 6:00 - 9:00
  if (time < 720) return 'forenoon' // 9:00 - 12:00
  if (time < 1020) return 'afternoon' // 12:00 - 17:00
  if (time < 1140) return 'dusk' // 17:00 - 19:00
  return 'night' // 19:00 - 24:00
}

/** 时间段中文名 */
export function getTimePhaseLabel(time: number): string {
  return PHASE_LABELS[getTimePhase(time)]
}

/** 根据时间返回昼夜 overlay 的颜色与透明度 */
export function getTimeOverlay(time: number): { color: number; alpha: number } {
  switch (getTimePhase(time)) {
    case 'morning':
    case 'forenoon':
      return { color: 0xffffff, alpha: 0 }
    case 'afternoon':
      return { color: 0xffb060, alpha: 0.06 }
    case 'dusk':
      return { color: 0xff7a3a, alpha: 0.2 }
    case 'night':
      return { color: 0x16233f, alpha: 0.45 }
  }
}
