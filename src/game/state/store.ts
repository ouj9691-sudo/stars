import type { Crop, CropType, Direction, FarmTile, GameState, ItemId } from '../types'
import { clearSave, loadState, saveState } from './save'
import { getDirtTiles } from '../world/mapData'
import { getDialogueFor } from '../systems/dialog'
import {
  ACTION_COST,
  CROP_DEFS,
  DAY_END,
  DAY_START,
  HOUSE_EXIT_COL,
  HOUSE_EXIT_ROW,
  HOUSE_INSIDE_COL,
  HOUSE_INSIDE_ROW,
  DEFAULT_ZOOM,
  INITIAL_MONEY,
  INITIAL_SEED_COUNT,
  MAX_ZOOM,
  MIN_ZOOM,
  NPC_DEFS,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  TILE_SIZE,
} from '../constants'

type Listener = () => void

/** 生成初始游戏状态 */
export function createInitialState(): GameState {
  return {
    player: {
      x: (PLAYER_SPAWN_COL + 0.5) * TILE_SIZE,
      y: (PLAYER_SPAWN_ROW + 0.5) * TILE_SIZE,
      facing: 'down',
    },
    scene: 'world',
    day: 1,
    time: DAY_START,
    money: INITIAL_MONEY,
    inventory: {
      hoe: 1,
      'watering-can': 1,
      'wheat-seed': INITIAL_SEED_COUNT,
      'carrot-seed': INITIAL_SEED_COUNT,
      'tomato-seed': INITIAL_SEED_COUNT,
      wheat: 0,
      carrot: 0,
      tomato: 0,
    },
    selectedItem: 'hoe',
    // 初始已开垦的耕地（地图中的 Dirt 区域）
    farmTiles: getDirtTiles().map(({ col, row }) => ({ col, row, watered: false })),
    crops: [],
    screen: 'menu',
    dialog: null,
    shopOpen: false,
    bagOpen: false,
    feedback: '',
    zoom: DEFAULT_ZOOM,
    helpOpen: false,
  }
}

/**
 * 全局游戏状态仓库（单例）：
 * - 持有唯一 GameState
 * - 提供数据操作 action，通知订阅者并持久化
 */
class GameStore {
  private state: GameState
  private listeners = new Set<Listener>()
  private version = 0
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    const initial = createInitialState()
    const loaded = loadState()
    this.state = loaded
      ? {
          ...initial,
          ...loaded,
          player: { ...initial.player, ...loaded.player },
          inventory: { ...initial.inventory, ...loaded.inventory },
          // UI 字段不持久化，加载时重置
          screen: 'menu',
          dialog: null,
          shopOpen: false,
          bagOpen: false,
          feedback: '',
          zoom: DEFAULT_ZOOM,
          helpOpen: false,
        }
      : initial

    // 兼容旧存档
    if (!this.state.time || this.state.time < DAY_START) this.state.time = DAY_START
    for (const c of this.state.crops) {
      if (c.plantedDay === undefined) c.plantedDay = this.state.day
    }
  }

  getState(): GameState {
    return this.state
  }

  getVersion(): number {
    return this.version
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** 是否打开了任意 UI（对话/商店/背包/帮助） */
  isUIOpen(): boolean {
    return (
      this.state.dialog !== null ||
      this.state.shopOpen ||
      this.state.bagOpen ||
      this.state.helpOpen
    )
  }

  /** 通知订阅者（不写存档） */
  private emit(): void {
    this.version++
    for (const fn of this.listeners) fn()
  }

  /** 显示一条短暂的反馈消息 */
  private flash(msg: string): void {
    this.state.feedback = msg
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer)
    this.feedbackTimer = setTimeout(() => {
      this.state.feedback = ''
      this.feedbackTimer = null
      this.emit()
    }, 2200)
  }

  /** 通知订阅者并写入存档 */
  private commit(): void {
    this.emit()
    saveState(this.state)
  }

  // ---------- 查询 ----------

  getFarmTile(col: number, row: number): FarmTile | undefined {
    return this.state.farmTiles.find((t) => t.col === col && t.row === row)
  }

  getCrop(col: number, row: number): Crop | undefined {
    return this.state.crops.find((c) => c.col === col && c.row === row)
  }

  hasSave(): boolean {
    return loadState() !== null
  }

  // ---------- 主菜单 ----------

  startNewGame(): void {
    this.state = createInitialState()
    this.state.screen = 'playing'
    saveState(this.state)
    this.emit()
  }

  continueGame(): void {
    if (!loadState()) return
    this.state.screen = 'playing'
    this.emit()
  }

  clearAllSave(): void {
    clearSave()
    this.emit()
  }

  // ---------- 基础动作 ----------

  selectItem(id: ItemId): void {
    if (this.state.selectedItem === id) return
    this.state.selectedItem = id
    this.commit()
  }

  updatePlayer(x: number, y: number, facing: Direction): void {
    this.state.player.x = x
    this.state.player.y = y
    this.state.player.facing = facing
  }

  persist(): void {
    saveState(this.state)
  }

  // ---------- 农场操作 ----------

  till(col: number, row: number): boolean {
    if (this.getFarmTile(col, row)) return false
    this.state.farmTiles.push({ col, row, watered: false })
    this.advanceTime(ACTION_COST.till)
    return true
  }

  plant(col: number, row: number, cropType: CropType): boolean {
    const def = CROP_DEFS[cropType]
    if (this.state.inventory[def.seedItem] <= 0) return false
    if (!this.getFarmTile(col, row)) return false
    if (this.getCrop(col, row)) return false

    this.state.inventory[def.seedItem] -= 1
    this.state.crops.push({
      col,
      row,
      type: cropType,
      stage: 0,
      plantedDay: this.state.day,
    })
    this.advanceTime(ACTION_COST.plant)
    return true
  }

  water(col: number, row: number): boolean {
    const tile = this.getFarmTile(col, row)
    if (!tile || tile.watered) return false
    if (!this.getCrop(col, row)) return false

    tile.watered = true
    this.advanceTime(ACTION_COST.water)
    return true
  }

  harvest(col: number, row: number): boolean {
    const crop = this.getCrop(col, row)
    if (!crop) return false
    const def = CROP_DEFS[crop.type]
    if (crop.stage < def.growthDays) return false

    this.state.crops = this.state.crops.filter(
      (c) => !(c.col === col && c.row === row),
    )
    // 收获获得作物（金币通过商店出售获得）
    this.state.inventory[def.productItem] += 1

    const tile = this.getFarmTile(col, row)
    if (tile) tile.watered = false

    this.flash(`获得 ${def.name} ×1`)
    this.advanceTime(ACTION_COST.harvest)
    return true
  }

  /** 结束当天（T 键，原地过天） */
  endDay(): void {
    this.advanceToNextDay()
    this.commit()
  }

  private advanceToNextDay(): void {
    this.state.day += 1
    this.state.time = DAY_START
    this.growCrops()
  }

  /** 推进时间，超过一天自动进入下一天 */
  private advanceTime(minutes: number): void {
    this.state.time += minutes
    if (this.state.time >= DAY_END) {
      this.state.time = DAY_START + (this.state.time - DAY_END)
      this.state.day += 1
      this.growCrops()
    }
    this.commit()
  }

  /** 浇过水的作物成长一个阶段，重置浇水状态 */
  private growCrops(): void {
    for (const crop of this.state.crops) {
      const tile = this.getFarmTile(crop.col, crop.row)
      if (tile && tile.watered) {
        const def = CROP_DEFS[crop.type]
        if (crop.stage < def.growthDays) crop.stage += 1
      }
    }
    for (const tile of this.state.farmTiles) tile.watered = false
  }

  // ---------- 场景切换 ----------

  enterHouse(): void {
    this.state.scene = 'house'
    this.state.player.x = (HOUSE_INSIDE_COL + 0.5) * TILE_SIZE
    this.state.player.y = (HOUSE_INSIDE_ROW + 0.5) * TILE_SIZE
    this.commit()
  }

  exitHouse(): void {
    this.state.scene = 'world'
    this.state.player.x = (HOUSE_EXIT_COL + 0.5) * TILE_SIZE
    this.state.player.y = (HOUSE_EXIT_ROW + 0.5) * TILE_SIZE
    this.commit()
  }

  // ---------- 对话 ----------

  openDialog(npcId: string): void {
    const npc = NPC_DEFS.find((n) => n.id === npcId)
    if (!npc) return
    this.state.dialog = {
      npcName: npc.name,
      lines: getDialogueFor(this.state.day),
      index: 0,
    }
    this.advanceTime(ACTION_COST.talk)
  }

  advanceDialog(): void {
    if (!this.state.dialog) return
    this.state.dialog.index += 1
    if (this.state.dialog.index >= this.state.dialog.lines.length) {
      this.state.dialog = null
    }
    this.emit()
  }

  closeDialog(): void {
    this.state.dialog = null
    this.emit()
  }

  // ---------- 商店 ----------

  openShop(): void {
    this.state.shopOpen = true
    this.state.feedback = ''
    this.emit()
  }

  closeShop(): void {
    this.state.shopOpen = false
    this.state.feedback = ''
    this.emit()
  }

  buySeed(cropType: CropType): boolean {
    const def = CROP_DEFS[cropType]
    if (this.state.money < def.seedPrice) {
      this.flash('金币不足')
      this.emit()
      return false
    }
    this.state.money -= def.seedPrice
    this.state.inventory[def.seedItem] += 1
    this.flash(`购买成功：${def.name}种子 +1`)
    this.commit()
    return true
  }

  sellCrop(cropType: CropType): boolean {
    const def = CROP_DEFS[cropType]
    if (this.state.inventory[def.productItem] <= 0) {
      this.flash('没有可出售的作物')
      this.emit()
      return false
    }
    this.state.inventory[def.productItem] -= 1
    this.state.money += def.sellPrice
    this.flash(`出售成功 +${def.sellPrice}金币`)
    this.commit()
    return true
  }

  // ---------- 背包 ----------

  openBag(): void {
    this.state.bagOpen = true
    this.emit()
  }

  closeBag(): void {
    this.state.bagOpen = false
    this.emit()
  }

  // ---------- 缩放 ----------

  setZoom(z: number): void {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
    if (this.state.zoom === clamped) return
    this.state.zoom = clamped
    this.emit()
  }

  // ---------- 帮助 ----------

  openHelp(): void {
    this.state.helpOpen = true
    this.emit()
  }

  closeHelp(): void {
    this.state.helpOpen = false
    this.emit()
  }
}

export const store = new GameStore()
