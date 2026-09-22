import { useEffect, useReducer } from 'react'
import { store } from '../game/state/store'
import type { GameState } from '../game/types'

/**
 * 订阅全局游戏状态，状态变化时触发组件重渲染。
 */
export function useGameState(): GameState {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => store.subscribe(forceUpdate), [])
  return store.getState()
}
