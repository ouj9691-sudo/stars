import Phaser from 'phaser'
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS, WORLD_WIDTH, WORLD_HEIGHT, BUILDINGS } from '../constants'
import { MAP_TILES, TileType, isWalkable } from './mapData'
import type { BuildingDef } from '../types'

// 柔和自然色
const GRASS = { base: 0x86b84a, dark: 0x74a83e, light: 0x97c85a, deep: 0x66a03a }
const DIRT = { base: 0xc99a5a, dark: 0xb8883f, light: 0xd8ab6a }
const WATER = { base: 0x5a9fc8, dark: 0x4a8cb4, light: 0x6ab0d8 }
const WOOD = { base: 0xc9a06a, dark: 0xb8905a, deep: 0xa0783f }
const ROOF = { base: 0xb5483a, dark: 0x963a30, light: 0xc85848 }

// 确定性伪随机（固定种子，保证地图每次一致）
function hash(col: number, row: number, salt = 0): number {
  let n = col * 374761393 + row * 668265263 + salt * 1442695041
  n = (n ^ (n >> 13)) * 1274126177
  return Math.abs((n ^ (n >> 16)) % 1000)
}

export class FarmMap {
  isWalkableAt(worldX: number, worldY: number): boolean {
    return isWalkable(Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE))
  }

  isWalkable(col: number, row: number): boolean {
    return isWalkable(col, row)
  }

  blocksArea(left: number, top: number, right: number, bottom: number): boolean {
    const c0 = Math.floor(left / TILE_SIZE)
    const c1 = Math.floor(right / TILE_SIZE)
    const r0 = Math.floor(top / TILE_SIZE)
    const r1 = Math.floor(bottom / TILE_SIZE)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!isWalkable(c, r)) return true
      }
    }
    return false
  }

  draw(scene: Phaser.Scene): void {
    const g = scene.add.graphics()

    // 先铺地面
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        const t = MAP_TILES[r][c]
        const x = c * TILE_SIZE
        const y = r * TILE_SIZE
        g.fillStyle(this.baseColor(t), 1)
        g.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      }
    }

    // 再画细节（草地纹理、水、树、石）
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        const t = MAP_TILES[r][c]
        const x = c * TILE_SIZE
        const y = r * TILE_SIZE
        this.drawTileDetail(g, t, x, y, c, r)
      }
    }

    // 最后画建筑（覆盖在草地之上）
    this.drawBuildings(g)

    // 烘焙成静态纹理，避免每帧重绘大量 Graphics 命令
    g.generateTexture('farm-map', WORLD_WIDTH, WORLD_HEIGHT)
    g.destroy()
    scene.add.image(0, 0, 'farm-map').setOrigin(0, 0).setDepth(0)
  }

  private baseColor(t: TileType): number {
    switch (t) {
      case TileType.Dirt:
        return DIRT.base
      case TileType.Water:
        return WATER.base
      default:
        return GRASS.base
    }
  }

  private drawTileDetail(
    g: Phaser.GameObjects.Graphics,
    t: TileType,
    x: number,
    y: number,
    c: number,
    r: number,
  ): void {
    switch (t) {
      case TileType.Grass:
        this.drawGrass(g, x, y, c, r)
        break
      case TileType.Dirt:
        this.drawDirt(g, x, y, c, r)
        break
      case TileType.Water:
        this.drawWater(g, x, y, c, r)
        break
      case TileType.Tree:
        this.drawTree(g, x, y, c, r)
        break
      case TileType.Stone:
        this.drawStone(g, x, y, c, r)
        break
      case TileType.Fence:
        this.drawFence(g, x, y)
        break
    }
  }

  // ---------- 草地 ----------

  private drawGrass(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, r: number): void {
    const h = hash(c, r)
    // 深浅草点
    if (h % 5 < 2) {
      g.fillStyle(GRASS.dark, 1)
      g.fillRect(x + (h % 4) * 7 + 2, y + (h % 3) * 9 + 2, 4, 4)
    }
    if (h % 7 === 0) {
      g.fillStyle(GRASS.light, 1)
      g.fillRect(x + (h % 3) * 8 + 3, y + (h % 2) * 14 + 4, 4, 3)
    }
    // 小草丛（几根短草）
    if (h % 11 === 0) {
      g.fillStyle(GRASS.deep, 1)
      g.fillRect(x + 6, y + 8, 1, 5)
      g.fillRect(x + 9, y + 6, 1, 7)
      g.fillRect(x + 12, y + 9, 1, 4)
    }
    // 小花
    if (h % 23 === 0) {
      const petal = h % 3 === 0 ? 0xf0e8d8 : h % 3 === 1 ? 0xf0c55a : 0xe07ab0
      g.fillStyle(petal, 1)
      g.fillRect(x + 10, y + 10, 3, 3)
      g.fillRect(x + 7, y + 13, 3, 3)
      g.fillRect(x + 13, y + 13, 3, 3)
      g.fillStyle(0xf7e8a0, 1)
      g.fillRect(x + 11, y + 12, 2, 2)
    }
    // 小石子
    if (h % 31 === 0) {
      g.fillStyle(0x9aa0a6, 1)
      g.fillRect(x + 16, y + 20, 3, 3)
      g.fillStyle(0xb0b6bb, 1)
      g.fillRect(x + 17, y + 20, 1, 2)
    }
  }

  // ---------- 耕地 ----------

  private drawDirt(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, r: number): void {
    // 垄沟
    g.fillStyle(DIRT.dark, 1)
    for (let i = 4; i < TILE_SIZE; i += 9) {
      g.fillRect(x, y + i, TILE_SIZE, 3)
    }
    // 土块
    const h = hash(c, r, 1)
    if (h % 3 === 0) {
      g.fillStyle(DIRT.dark, 1)
      g.fillRect(x + (h % 3) * 9 + 3, y + (h % 2) * 12 + 2, 5, 4)
    }
    if (h % 5 === 0) {
      g.fillStyle(DIRT.light, 1)
      g.fillRect(x + (h % 2) * 14 + 4, y + (h % 3) * 8 + 3, 4, 3)
    }
  }

  // ---------- 水塘 ----------

  private drawWater(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, r: number): void {
    const h = hash(c, r, 2)
    // 波纹
    if (h % 3 === 0) {
      g.fillStyle(WATER.light, 1)
      g.fillRect(x + 4, y + 6, 10, 3)
    }
    if (h % 4 === 0) {
      g.fillStyle(WATER.dark, 1)
      g.fillRect(x + 12, y + 18, 8, 3)
    }
    // 岸边草（水边缘）
    if (h % 9 === 0) {
      g.fillStyle(GRASS.deep, 1)
      g.fillRect(x + 2, y + 2, 2, 3)
    }
  }

  // ---------- 树（3 种） ----------

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, r: number): void {
    const kind = hash(c, r, 3) % 3
    // 树影
    g.fillStyle(0x3a2a1a, 1)
    g.fillRect(x + 8, y + 26, 16, 4)

    // 树干
    g.fillStyle(0x8a5a33, 1)
    g.fillRect(x + 12, y + 18, 7, 12)
    g.fillStyle(0x6e4528, 1)
    g.fillRect(x + 12, y + 18, 2, 12)

    if (kind === 0) {
      // 阔叶树（圆润不规则冠）
      g.fillStyle(0x2f7038, 1)
      g.fillRect(x + 5, y + 5, 22, 16)
      g.fillStyle(0x3e8a4a, 1)
      g.fillRect(x + 3, y + 2, 26, 16)
      g.fillStyle(0x4a9a58, 1)
      g.fillRect(x + 6, y + 1, 18, 13)
      g.fillStyle(0x2a6632, 1)
      g.fillRect(x + 12, y + 12, 10, 8)
    } else if (kind === 1) {
      // 松树（尖顶）
      g.fillStyle(0x275c30, 1)
      g.fillTriangle(x + 4, y + 20, x + 16, y - 2, x + 28, y + 20)
      g.fillStyle(0x3e8a4a, 1)
      g.fillTriangle(x + 8, y + 18, x + 16, y - 4, x + 24, y + 18)
      g.fillStyle(0x4a9a58, 1)
      g.fillTriangle(x + 12, y + 16, x + 16, y - 4, x + 20, y + 16)
    } else {
      // 果树（较矮，带果实）
      g.fillStyle(0x3e8a4a, 1)
      g.fillRect(x + 6, y + 3, 20, 14)
      g.fillStyle(0x4a9a58, 1)
      g.fillRect(x + 8, y + 1, 16, 13)
      g.fillStyle(0x2f7038, 1)
      g.fillRect(x + 10, y + 10, 14, 7)
      // 果实
      g.fillStyle(0xe05a3a, 1)
      g.fillRect(x + 8, y + 5, 3, 3)
      g.fillRect(x + 20, y + 8, 3, 3)
      g.fillRect(x + 14, y + 12, 3, 3)
    }
  }

  // ---------- 石头 ----------

  private drawStone(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, r: number): void {
    const big = hash(c, r, 4) % 2 === 0
    if (big) {
      g.fillStyle(0x3a2a1a, 1)
      g.fillRect(x + 5, y + 20, 22, 5)
      g.fillStyle(0x7a8288, 1)
      g.fillRect(x + 5, y + 10, 22, 13)
      g.fillStyle(0x9aa0a6, 1)
      g.fillRect(x + 7, y + 8, 18, 13)
      g.fillStyle(0xb0b6bb, 1)
      g.fillRect(x + 9, y + 9, 9, 6)
      g.fillStyle(0x6a7278, 1)
      g.fillRect(x + 14, y + 14, 8, 5)
    } else {
      g.fillStyle(0x7a8288, 1)
      g.fillRect(x + 8, y + 16, 16, 9)
      g.fillStyle(0x9aa0a6, 1)
      g.fillRect(x + 10, y + 14, 13, 9)
      g.fillStyle(0xb0b6bb, 1)
      g.fillRect(x + 12, y + 15, 6, 4)
    }
  }

  // ---------- 栅栏 ----------

  private drawFence(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(WOOD.deep, 1)
    g.fillRect(x + 3, y + 4, 5, 26)
    g.fillRect(x + 24, y + 4, 5, 26)
    g.fillStyle(WOOD.base, 1)
    g.fillRect(x + 2, y + 9, 28, 5)
    g.fillRect(x + 2, y + 19, 28, 5)
    g.fillStyle(WOOD.dark, 1)
    g.fillRect(x + 2, y + 11, 28, 2)
  }

  // ---------- 建筑 ----------

  private drawBuildings(g: Phaser.GameObjects.Graphics): void {
    for (const b of BUILDINGS) {
      if (b.id === 'house') this.drawHouse(g, b)
      else this.drawShop(g, b)
    }
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, b: BuildingDef): void {
    const x = b.col * TILE_SIZE
    const y = b.row * TILE_SIZE
    const w = b.width * TILE_SIZE
    const h = b.height * TILE_SIZE

    // 建筑阴影
    g.fillStyle(0x3a2a1a, 1)
    g.fillRect(x + 4, y + h - 4, w, 8)

    // 木墙
    g.fillStyle(WOOD.base, 1)
    g.fillRect(x, y + 44, w, h - 44)
    // 横板纹理
    g.fillStyle(WOOD.dark, 1)
    for (let i = 52; i < h; i += 12) {
      g.fillRect(x, y + i, w, 2)
    }
    g.fillStyle(WOOD.deep, 1)
    g.fillRect(x, y + 44, w, 3)

    // 斜坡屋顶（三角 + 瓦片纹理）
    g.fillStyle(ROOF.base, 1)
    g.fillTriangle(x - 8, y + 46, x + w / 2, y - 10, x + w + 8, y + 46)
    g.fillRect(x - 8, y + 38, w + 16, 10)
    g.fillStyle(ROOF.dark, 1)
    for (let i = 0; i < 5; i++) {
      g.fillRect(x + 8 + i * 30, y + 44 - i * 8, 14, 3)
    }
    g.fillStyle(ROOF.light, 1)
    g.fillRect(x + w / 2 - 8, y - 8, 16, 4)

    // 烟囱
    g.fillStyle(0x8a6a4a, 1)
    g.fillRect(x + w - 34, y - 6, 12, 26)
    g.fillStyle(0x6e5238, 1)
    g.fillRect(x + w - 34, y - 6, 3, 26)
    g.fillStyle(0x3a2a1a, 1)
    g.fillRect(x + w - 36, y - 8, 16, 4)

    // 窗户（两个，带窗框）
    this.drawWindow(g, x + 16, y + 64, 0x8fc7e8)
    this.drawWindow(g, x + w - 38, y + 64, 0x8fc7e8)

    // 门（带门框 + 台阶）
    const doorX = x + (b.door.col - b.col) * TILE_SIZE
    const doorY = y + (b.door.row - b.row) * TILE_SIZE
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(doorX, doorY - 6, 28, TILE_SIZE + 6)
    g.fillStyle(0x6b4423, 1)
    g.fillRect(doorX + 2, doorY - 2, 24, TILE_SIZE)
    g.fillStyle(0x8a5a33, 1)
    g.fillRect(doorX + 20, doorY + 12, 3, 3)
    // 台阶
    g.fillStyle(0xa0783f, 1)
    g.fillRect(doorX - 2, doorY + TILE_SIZE, 32, 4)
  }

  private drawShop(g: Phaser.GameObjects.Graphics, b: BuildingDef): void {
    const x = b.col * TILE_SIZE
    const y = b.row * TILE_SIZE
    const w = b.width * TILE_SIZE
    const h = b.height * TILE_SIZE

    // 阴影
    g.fillStyle(0x3a2a1a, 1)
    g.fillRect(x + 4, y + h - 4, w, 8)

    // 木墙（浅色）
    g.fillStyle(0xe0c898, 1)
    g.fillRect(x, y + 40, w, h - 40)
    g.fillStyle(0xd0b888, 1)
    for (let i = 48; i < h; i += 14) {
      g.fillRect(x, y + i, w, 2)
    }

    // 绿色屋顶
    g.fillStyle(0x3a7048, 1)
    g.fillRect(x - 6, y + 20, w + 12, 24)
    g.fillStyle(0x4a8c5a, 1)
    g.fillRect(x - 4, y + 22, w + 8, 20)
    g.fillStyle(0x5aa06c, 1)
    g.fillRect(x - 4, y + 22, w + 8, 5)

    // 大招牌
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(x + 6, y + 50, w - 12, 30)
    g.fillStyle(0xf0c55a, 1)
    g.fillRect(x + 10, y + 54, w - 20, 22)
    g.fillStyle(0x8a5a33, 1)
    for (let i = 0; i < 4; i++) {
      g.fillRect(x + 22 + i * 26, y + 58, 12, 14)
    }

    // 窗户
    this.drawWindow(g, x + 16, y + 92, 0x8fc7e8)
    this.drawWindow(g, x + w - 38, y + 92, 0x8fc7e8)

    // 灯（门两侧）
    g.fillStyle(0xf7e8a0, 1)
    g.fillRect(x + 20, y + 100, 6, 6)
    g.fillRect(x + w - 26, y + 100, 6, 6)

    // 大门
    const doorX = x + (b.door.col - b.col) * TILE_SIZE
    const doorY = y + (b.door.row - b.row) * TILE_SIZE
    g.fillStyle(0x4a2f16, 1)
    g.fillRect(doorX, doorY - 6, 30, TILE_SIZE + 6)
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(doorX + 3, doorY - 2, 24, TILE_SIZE)
    g.fillStyle(0xf0c55a, 1)
    g.fillRect(doorX + 20, doorY + 14, 4, 4)
    // 商品箱
    g.fillStyle(0x8a5a33, 1)
    g.fillRect(doorX + 34, doorY + 14, 18, 14)
    g.fillStyle(0xa0783f, 1)
    g.fillRect(doorX + 34, doorY + 14, 18, 4)
  }

  private drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, glass: number): void {
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(x - 2, y - 2, 24, 24)
    g.fillStyle(glass, 1)
    g.fillRect(x, y, 20, 20)
    g.fillStyle(0xe0f0f8, 1)
    g.fillRect(x + 3, y + 3, 5, 5)
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(x + 9, y, 2, 20)
    g.fillRect(x, y + 9, 20, 2)
  }
}
