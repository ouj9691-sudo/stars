import type { GameState } from '../types'

const SAVE_KEY = 'pixel-farm-save-v1'

/** 保存状态到 localStorage（失败时静默忽略，不影响游戏） */
export function saveState(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('存档保存失败', e)
  }
}

/** 读取存档，无存档或解析失败返回 null */
export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch (e) {
    console.warn('存档读取失败', e)
    return null
  }
}

/** 清空存档（供调试使用） */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch (e) {
    console.warn('清空存档失败', e)
  }
}
