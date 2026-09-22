import { useState } from 'react'
import { store } from '../game/state/store'

/** 主菜单：开始 / 继续 / 清除存档 */
export function MainMenu() {
  const [hasSave, setHasSave] = useState(() => store.hasSave())
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="menu-screen">
      <div className="menu-box">
        <span className="menu-icon">🌾</span>
        <h1 className="menu-title">像素农场</h1>
        <span className="menu-sub">Pixel Farm</span>

        <div className="menu-buttons">
          <button className="menu-btn" onClick={() => store.startNewGame()}>
            开始游戏
          </button>
          <button
            className="menu-btn"
            disabled={!hasSave}
            onClick={() => store.continueGame()}
          >
            继续游戏
          </button>

          {confirming ? (
            <div className="menu-confirm">
              <span className="menu-confirm-text">确定清除存档？</span>
              <button
                className="menu-btn small"
                onClick={() => {
                  store.clearAllSave()
                  setHasSave(false)
                  setConfirming(false)
                }}
              >
                确定
              </button>
              <button className="menu-btn small" onClick={() => setConfirming(false)}>
                取消
              </button>
            </div>
          ) : (
            <button className="menu-btn" onClick={() => setConfirming(true)}>
              清除存档
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
