// 游戏核心数据类型定义

export type Direction = 'up' | 'down' | 'left' | 'right'

export type CropType = 'wheat' | 'carrot' | 'tomato'

export type ItemId =
  | 'hoe'
  | 'watering-can'
  | 'wheat-seed'
  | 'carrot-seed'
  | 'tomato-seed'
  | 'wheat'
  | 'carrot'
  | 'tomato'

// 游戏内场景（室外 / 室内）
export type SceneId = 'world' | 'house'

// 应用界面（主菜单 / 游戏中）
export type Screen = 'menu' | 'playing'

// 一天中的时间段
export type TimePhase = 'morning' | 'forenoon' | 'afternoon' | 'dusk' | 'night'

// 作物配置
export interface CropDef {
  name: string
  seedItem: ItemId
  productItem: ItemId
  sellPrice: number
  seedPrice: number
  growthDays: number // 成熟所需浇水天数
  color: number
}

// 一块已开垦的农田（锄地后进入 farmTiles）
export interface FarmTile {
  col: number
  row: number
  watered: boolean // 当天是否已浇水
}

// 一株作物
export interface Crop {
  col: number
  row: number
  type: CropType
  stage: number // 0=幼苗，1..growthDays-1=成长中，growthDays=成熟
  plantedDay: number // 种植日期
}

// 对话框状态
export interface DialogState {
  npcName: string
  lines: string[]
  index: number
}

// 全局游戏状态（唯一数据源，由 store 管理）
export interface GameState {
  player: {
    x: number
    y: number
    facing: Direction
  }
  scene: SceneId
  day: number
  time: number // 当天分钟数，6:00 = 360
  money: number
  inventory: Record<ItemId, number>
  selectedItem: ItemId
  farmTiles: FarmTile[]
  crops: Crop[]

  // UI 状态（不持久化，加载时重置）
  screen: Screen
  dialog: DialogState | null
  shopOpen: boolean
  bagOpen: boolean
  feedback: string
  zoom: number
  helpOpen: boolean
}

// 玩家对目标格子的交互动作
export type Interaction =
  | 'till'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'talk'
  | 'enter-house'
  | 'enter-shop'
  | 'sleep'
  | 'exit-house'

// 建筑定义
export interface BuildingDef {
  id: 'house' | 'shop'
  name: string
  col: number
  row: number
  width: number
  height: number
  door: { col: number; row: number } // 门所在的墙格
}

// NPC 定义
export interface NpcDef {
  id: string
  name: string
  col: number
  row: number
}

// 碰撞检测接口（FarmMap 与 IndoorMap 都实现）
export interface CollisionMap {
  blocksArea(left: number, top: number, right: number, bottom: number): boolean
}
