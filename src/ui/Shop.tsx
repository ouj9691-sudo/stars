import { useEffect } from 'react'
import { CROP_DEFS, ITEM_ICONS } from '../game/constants'
import { store } from '../game/state/store'
import { useGameState } from './useGameState'
import type { CropType } from '../game/types'

const CROPS: CropType[] = ['wheat', 'carrot', 'tomato']

/** 商店面板：买种子 + 卖作物 */
export function Shop() {
  const state = useGameState()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.closeShop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="modal-overlay">
      <div className="shop-panel">
        <div className="panel-head">
          <h2>商店</h2>
          <span className="shop-money">
            金币 <b>{state.money}</b>
          </span>
          <button className="panel-close" onClick={() => store.closeShop()}>
            ✕
          </button>
        </div>

        <div className="shop-section">
          <h3>购买种子</h3>
          {CROPS.map((crop) => {
            const def = CROP_DEFS[crop]
            return (
              <div className="shop-row" key={crop}>
                <span className="shop-item">
                  {ITEM_ICONS[def.seedItem]} {def.name}种子
                </span>
                <span className="shop-price">{def.seedPrice} 金币</span>
                <button className="shop-btn" onClick={() => store.buySeed(crop)}>
                  购买
                </button>
              </div>
            )
          })}
        </div>

        <div className="shop-section">
          <h3>出售作物</h3>
          {CROPS.map((crop) => {
            const def = CROP_DEFS[crop]
            const count = state.inventory[def.productItem]
            return (
              <div className="shop-row" key={crop}>
                <span className="shop-item">
                  {ITEM_ICONS[def.productItem]} {def.name} ×{count}
                </span>
                <span className="shop-price">{def.sellPrice} 金币</span>
                <button
                  className="shop-btn"
                  disabled={count <= 0}
                  onClick={() => store.sellCrop(crop)}
                >
                  出售
                </button>
              </div>
            )
          })}
        </div>

        <div className="shop-feedback">{state.feedback}</div>
      </div>
    </div>
  )
}
