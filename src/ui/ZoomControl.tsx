import { DEFAULT_ZOOM, ZOOM_STEP } from '../game/constants'
import { store } from '../game/state/store'
import { useGameState } from './useGameState'

/** 游戏画面缩放控件（− 百分比 +） */
export function ZoomControl() {
  const state = useGameState()
  const percent = Math.round(state.zoom * 100)

  return (
    <div className="zoom-control">
      <button
        className="zoom-btn"
        onClick={() => store.setZoom(state.zoom - ZOOM_STEP)}
        title="缩小"
      >
        −
      </button>
      <button
        className="zoom-value"
        onClick={() => store.setZoom(DEFAULT_ZOOM)}
        title="重置缩放"
      >
        {percent}%
      </button>
      <button
        className="zoom-btn"
        onClick={() => store.setZoom(state.zoom + ZOOM_STEP)}
        title="放大"
      >
        +
      </button>
    </div>
  )
}
