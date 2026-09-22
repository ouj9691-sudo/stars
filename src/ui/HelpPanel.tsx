import { useEffect } from 'react'
import { BUILDINGS, CROP_DEFS, NPC_DEFS } from '../game/constants'
import { store } from '../game/state/store'
import type { CropType } from '../game/types'

const CROPS: CropType[] = ['wheat', 'carrot', 'tomato']

/** 帮助面板：操作 / 农场流程 / 作物百科 / 地点 / 睡觉 / 提示 */
export function HelpPanel() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.closeHelp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const npcName = NPC_DEFS[0]?.name ?? 'NPC'
  const houseName = BUILDINGS.find((b) => b.id === 'house')?.name ?? '房屋'
  const shopName = BUILDINGS.find((b) => b.id === 'shop')?.name ?? '商店'

  return (
    <div className="modal-overlay">
      <div className="help-panel">
        <div className="panel-head">
          <h2>📖 游戏指南</h2>
          <button className="panel-close" onClick={() => store.closeHelp()}>
            ✕
          </button>
        </div>

        <div className="help-content">
          <section className="help-section">
            <h3>🎮 操作</h3>
            <div className="help-row">
              <span className="help-key">W A S D</span> 或 方向键 移动
            </div>
            <div className="help-row">
              <span className="help-key">E</span> 互动
            </div>
            <div className="help-row">
              <span className="help-key">I</span> 打开背包
            </div>
            <div className="help-row">
              <span className="help-key">T</span> 结束一天
            </div>
            <div className="help-row">
              <span className="help-key">ESC</span> 关闭当前窗口
            </div>
            <div className="help-row">
              <span className="help-key">鼠标滚轮</span> 缩放游戏画面
            </div>
          </section>

          <section className="help-section">
            <h3>🌱 种植流程</h3>
            <div className="help-flow">
              锄地 → 播种 → 浇水 → 等待成长 → 收获 → 出售换金币 → 购买新种子
            </div>
          </section>

          <section className="help-section">
            <h3>🌾 作物百科</h3>
            {CROPS.map((crop) => {
              const def = CROP_DEFS[crop]
              return (
                <div className="help-row" key={crop}>
                  <span className="help-crop">{def.name}</span>
                  成熟 {def.growthDays} 天 · 买 {def.seedPrice} · 卖 {def.sellPrice}
                </div>
              )
            })}
          </section>

          <section className="help-section">
            <h3>🏪 地点</h3>
            <div className="help-row">🏠 {houseName}：睡觉、进入下一天</div>
            <div className="help-row">🛒 {shopName}：购买种子、出售作物</div>
            <div className="help-row">🌾 农田：种植、浇水、收获</div>
            <div className="help-row">👩 {npcName}：与 NPC 对话</div>
          </section>

          <section className="help-section">
            <h3>🌙 睡觉</h3>
            <div className="help-flow">
              进入房屋 → 靠近床 → 按 E 睡觉 → 躺下 → 夜晚 → 第二天 → 清晨 → 自动起床
            </div>
            <div className="help-row">睡觉会进入下一天。</div>
          </section>

          <section className="help-section">
            <h3>💡 游戏提示</h3>
            <div className="help-row">· 作物需要每天浇水才能正常成长。</div>
            <div className="help-row">· 成熟的作物可以收获后拿到商店出售。</div>
            <div className="help-row">· 金币可以购买新的种子。</div>
            <div className="help-row">· 睡觉可以进入下一天。</div>
            <div className="help-row">· 第一次玩建议先熟悉农场和商店的位置。</div>
          </section>
        </div>
      </div>
    </div>
  )
}
