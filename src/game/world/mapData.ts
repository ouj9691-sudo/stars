import { WORLD_COLS, WORLD_ROWS, BUILDINGS, NPC_DEFS } from '../constants'

// 瓦片类型
export enum TileType {
  Grass = 0, // 草地（可行走，可锄地）
  Dirt = 1, // 耕地（可行走，初始已开垦）
  Water = 2, // 水（不可行走）
  Tree = 3, // 树（不可行走）
  Stone = 4, // 石头（不可行走）
  Fence = 5, // 栅栏（不可行走）
  Wall = 6, // 建筑 / NPC 占位（不可行走，视觉由建筑/NPC 绘制覆盖）
}

const WALKABLE = new Set<TileType>([TileType.Grass, TileType.Dirt])

function generateMap(): TileType[][] {
  const tiles: TileType[][] = []
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row: TileType[] = []
    for (let c = 0; c < WORLD_COLS; c++) row.push(TileType.Grass)
    tiles.push(row)
  }

  // 四周一圈栅栏
  for (let c = 0; c < WORLD_COLS; c++) {
    tiles[0][c] = TileType.Fence
    tiles[WORLD_ROWS - 1][c] = TileType.Fence
  }
  for (let r = 0; r < WORLD_ROWS; r++) {
    tiles[r][0] = TileType.Fence
    tiles[r][WORLD_COLS - 1] = TileType.Fence
  }

  // 建筑占位（墙体，不可走）
  for (const b of BUILDINGS) {
    for (let r = b.row; r < b.row + b.height; r++) {
      for (let c = b.col; c < b.col + b.width; c++) {
        tiles[r][c] = TileType.Wall
      }
    }
  }

  // NPC 占位（不可走）
  for (const n of NPC_DEFS) {
    tiles[n.row][n.col] = TileType.Wall
  }

  // 水塘（房屋东南、农田北）
  for (let r = 10; r <= 13; r++) {
    for (let c = 12; c <= 17; c++) tiles[r][c] = TileType.Water
  }

  // 农田（中下，初始已开垦）
  for (let r = 18; r <= 26; r++) {
    for (let c = 14; c <= 26; c++) tiles[r][c] = TileType.Dirt
  }

  // 树木（[列, 行]）
  const trees: Array<[number, number]> = [
    [2, 12],
    [3, 15],
    [9, 3],
    [11, 7],
    [19, 14],
    [28, 28],
    [36, 28],
    [27, 15],
    [37, 5],
    [23, 4],
  ]
  for (const [c, r] of trees) tiles[r][c] = TileType.Tree

  // 石头（[列, 行]）
  const stones: Array<[number, number]> = [
    [10, 8],
    [21, 12],
    [28, 18],
    [36, 13],
    [24, 5],
  ]
  for (const [c, r] of stones) tiles[r][c] = TileType.Stone

  return tiles
}

// 全局唯一地图数据（确定性生成，store 与渲染共用同一份）
export const MAP_TILES: TileType[][] = generateMap()

/** 取某瓦片类型，越界返回栅栏（视为不可走） */
export function tileAt(col: number, row: number): TileType {
  if (col < 0 || row < 0 || col >= WORLD_COLS || row >= WORLD_ROWS) return TileType.Fence
  return MAP_TILES[row][col]
}

/** 某瓦片是否可行走（越界为 false） */
export function isWalkable(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= WORLD_COLS || row >= WORLD_ROWS) return false
  return WALKABLE.has(MAP_TILES[row][col])
}

/** 某瓦片是否可耕作（草地或耕地，可锄地/播种） */
export function isFarmable(col: number, row: number): boolean {
  const t = tileAt(col, row)
  return t === TileType.Grass || t === TileType.Dirt
}

/** 初始已开垦的耕地（地图中的 Dirt 区域） */
export function getDirtTiles(): Array<{ col: number; row: number }> {
  const result: Array<{ col: number; row: number }> = []
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (MAP_TILES[r][c] === TileType.Dirt) result.push({ col: c, row: r })
    }
  }
  return result
}
