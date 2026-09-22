import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGame } from './game/Game'
import { store } from './game/state/store'
import { useGameState } from './ui/useGameState'
import { Hotbar } from './ui/Hotbar'
import { MainMenu } from './ui/MainMenu'
import { Dialog } from './ui/Dialog'
import { Shop } from './ui/Shop'
import { Bag } from './ui/Bag'
import { ZoomControl } from './ui/ZoomControl'
import { HelpPanel } from './ui/HelpPanel'
import { getTimePhaseLabel } from './game/systems/time'
import './App.css'

function App() {
  const state = useGameState()
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (state.screen === 'playing') {
      if (!gameRef.current) gameRef.current = createGame('game-container')
    } else if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
  }, [state.screen])

  if (state.screen === 'menu') {
    return <MainMenu />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🌾</span>
          <h1>像素农场</h1>
        </div>
        <div className="day-info">
          Day {state.day} · {getTimePhaseLabel(state.time)}
        </div>
        <div className="topbar-right">
          <span className="pill">
            金币 <b>{state.money}</b>
          </span>
          <button
            className="help-btn"
            onClick={() => (state.helpOpen ? store.closeHelp() : store.openHelp())}
            title="帮助"
          >
            ?
          </button>
        </div>
      </header>

      <main className="game-area">
        <div id="game-container" className="game-container" />
        <ZoomControl />
      </main>

      <Hotbar />

      <footer className="statusbar">
        <span className="hint">
          <span className="key">WASD</span> 移动
          <span className="key">E</span> 交互
          <span className="key">1-5</span> 选择
          <span className="key">I</span> 背包
          <span className="key">T</span> 结束今天
        </span>
        <span className="version">v0.3.0</span>
      </footer>

      {state.feedback && !state.shopOpen && (
        <div className="feedback-toast">{state.feedback}</div>
      )}

      {state.dialog && <Dialog />}
      {state.shopOpen && <Shop />}
      {state.bagOpen && <Bag />}
      {state.helpOpen && <HelpPanel />}
    </div>
  )
}

export default App
