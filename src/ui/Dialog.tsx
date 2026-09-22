import { useEffect } from 'react'
import { store } from '../game/state/store'
import { useGameState } from './useGameState'

/** NPC 对话框 */
export function Dialog() {
  const state = useGameState()
  const dialog = state.dialog

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        store.advanceDialog()
      } else if (e.key === 'Escape') {
        store.closeDialog()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!dialog) return null

  return (
    <div className="modal-overlay">
      <div className="dialog-box">
        <div className="dialog-name">{dialog.npcName}</div>
        <div className="dialog-text">{dialog.lines[dialog.index]}</div>
        <div className="dialog-hint">按 E / Enter 继续</div>
      </div>
    </div>
  )
}
