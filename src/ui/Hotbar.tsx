import { HOTBAR_ITEMS, ITEM_ICONS, ITEM_NAMES } from '../game/constants'
import { store } from '../game/state/store'
import { useGameState } from './useGameState'
import type { ItemId } from '../game/types'

const TOOL_ITEMS: ReadonlySet<ItemId> = new Set(['hoe', 'watering-can'])

/** 底部快捷栏：锄头 / 水壶 / 三种种子 */
export function Hotbar() {
  const state = useGameState()

  return (
    <div className="hotbar">
      {HOTBAR_ITEMS.map((id, i) => {
        const isTool = TOOL_ITEMS.has(id)
        const count = state.inventory[id]
        return (
          <button
            key={id}
            type="button"
            className={`hotbar-slot${state.selectedItem === id ? ' selected' : ''}`}
            onClick={() => store.selectItem(id)}
            title={ITEM_NAMES[id]}
          >
            <span className="slot-key">{i + 1}</span>
            <span className="slot-icon">{ITEM_ICONS[id]}</span>
            <span className="slot-name">{ITEM_NAMES[id]}</span>
            {!isTool && <span className="slot-count">×{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
