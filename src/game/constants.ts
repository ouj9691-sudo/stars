import type { BuildingDef, CropDef, CropType, ItemId, NpcDef } from './types'

// 游戏基础常量：瓦片大小、世界尺寸、玩家参数等

// 单个瓦片的像素尺寸（像素风以 2 的幂次为宜）
export const TILE_SIZE = 32

// 地图大小（瓦片数）
export const WORLD_COLS = 40
export const WORLD_ROWS = 30
export const WORLD_WIDTH = WORLD_COLS * TILE_SIZE
export const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE

// Phaser 显示视口（会被等比缩放适配到容器）
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 600

// 玩家移动速度（像素 / 秒）
export const PLAYER_SPEED = 180

// 摄像机缩放
export const MIN_ZOOM = 0.75
export const MAX_ZOOM = 1.75
export const DEFAULT_ZOOM = 1.0
export const ZOOM_STEP = 0.1

// 玩家出生点（室外，瓦片坐标）
export const PLAYER_SPAWN_COL = 10
export const PLAYER_SPAWN_ROW = 12

// 初始金币 / 种子数量
export const INITIAL_MONEY = 100
export const INITIAL_SEED_COUNT = 5

// ---------- 时间系统 ----------

// 一天开始（6:00）与结束（24:00），单位：分钟
export const DAY_START = 360
export const DAY_END = 1440

// 各种动作消耗的游戏时间（分钟）
export const ACTION_COST: Record<string, number> = {
  till: 30,
  plant: 20,
  water: 20,
  harvest: 20,
  talk: 10,
}

// ---------- 作物配置 ----------

export const CROP_DEFS: Record<CropType, CropDef> = {
  wheat: {
    name: '小麦',
    seedItem: 'wheat-seed',
    productItem: 'wheat',
    sellPrice: 20,
    seedPrice: 10,
    growthDays: 2,
    color: 0xf0c55a,
  },
  carrot: {
    name: '胡萝卜',
    seedItem: 'carrot-seed',
    productItem: 'carrot',
    sellPrice: 30,
    seedPrice: 15,
    growthDays: 3,
    color: 0xe0703a,
  },
  tomato: {
    name: '番茄',
    seedItem: 'tomato-seed',
    productItem: 'tomato',
    sellPrice: 50,
    seedPrice: 20,
    growthDays: 4,
    color: 0xe03a3a,
  },
}

// ---------- 物品配置 ----------

// 快捷栏顺序（数字键 1~5 对应）
export const HOTBAR_ITEMS: ItemId[] = [
  'hoe',
  'watering-can',
  'wheat-seed',
  'carrot-seed',
  'tomato-seed',
]

export const ITEM_NAMES: Record<ItemId, string> = {
  hoe: '锄头',
  'watering-can': '水壶',
  'wheat-seed': '小麦种子',
  'carrot-seed': '胡萝卜种子',
  'tomato-seed': '番茄种子',
  wheat: '小麦',
  carrot: '胡萝卜',
  tomato: '番茄',
}

export const ITEM_ICONS: Record<ItemId, string> = {
  hoe: '⛏️',
  'watering-can': '💧',
  'wheat-seed': '🌾',
  'carrot-seed': '🥕',
  'tomato-seed': '🍅',
  wheat: '🌾',
  carrot: '🥕',
  tomato: '🍅',
}

// 种子 -> 作物类型
export const SEED_TO_CROP: Partial<Record<ItemId, CropType>> = {
  'wheat-seed': 'wheat',
  'carrot-seed': 'carrot',
  'tomato-seed': 'tomato',
}

// ---------- 建筑 ----------

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'house',
    name: '家',
    col: 4,
    row: 3,
    width: 5,
    height: 5,
    door: { col: 6, row: 7 },
  },
  {
    id: 'shop',
    name: '商店',
    col: 30,
    row: 6,
    width: 5,
    height: 5,
    door: { col: 32, row: 10 },
  },
]

// ---------- NPC ----------

export const NPC_DEFS: NpcDef[] = [{ id: 'amy', name: '艾米', col: 32, row: 13 }]

// ---------- 室内坐标 ----------

// 玩家从房屋出来后站的位置（室外，瓦片坐标）
export const HOUSE_EXIT_COL = 6
export const HOUSE_EXIT_ROW = 8
// 玩家进入房屋后的室内出生位置（瓦片坐标）
export const HOUSE_INSIDE_COL = 9
export const HOUSE_INSIDE_ROW = 12
