import { useEffect } from 'react'
import { ITEM_ICONS, ITEM_NAMES } from '../game/constants'
import { store } from '../game/state/store'
import { useGameState } from './useGameState'
import type { ItemId } from '../game/types'

const SEED_ITEMS: ItemId[] = ['wheat-seed', 'carrot-seed', 'tomato-seed']
const PRODUCT_ITEMS: ItemId[] = ['wheat', 'carrot', 'tomato']

/** 背包面板 */
export function Bag() {
  const state = useGameState()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I' || e.key === 'Escape') store.closeBag()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="modal-overlay">
      <div className="bag-panel">
        <div className="panel-head">
          <h2>背包</h2>
          <button className="panel-close" onClick={() => store.closeBag()}>
            ✕
          </button>
        </div>

        <div className="bag-list">
          {[...SEED_ITEMS, ...PRODUCT_ITEMS].map((id) => (
            <div className="bag-row" key={id}>
              <span className="bag-icon">{ITEM_ICONS[id]}</span>
              <span className="bag-name">{ITEM_NAMES[id]}</span>
              <span className="bag-count">×{state.inventory[id]}</span>
            </div>
          ))}
        </div>

        <div className="bag-hint">按 I 或 ESC 关闭</div>
      </div>
    </div>
  )
}
