import Phaser from 'phaser'
import { TILE_SIZE } from '../constants'
import type { CollisionMap } from '../types'

// 室内尺寸（格）
const COLS = 20
const ROWS = 14
export const INDOOR_WIDTH = COLS * TILE_SIZE
export const INDOOR_HEIGHT = ROWS * TILE_SIZE

// 床位置（格范围）
const BED = { col: 2, row: 2, width: 4, height: 3 }

// 床中心及周边位置（世界坐标，供睡觉流程使用）
export const BED_CENTER_X = (BED.col + BED.width / 2) * TILE_SIZE
export const BED_LYING_Y = BED.row * TILE_SIZE + 24
export const BED_APPROACH_Y = (BED.row + BED.height + 0.5) * TILE_SIZE
// 桌子
const TABLE = { col: 12, row: 3, width: 2, height: 2 }
// 出口（南墙上的门）
export const EXIT_COL = 9
export const EXIT_ROW = 13

/**
 * 室内地图：地板、墙、床、桌子、出口，以及碰撞检测。
 */
export class IndoorMap implements CollisionMap {
  isWalkable(col: number, row: number): boolean {
    // 边界墙
    if (col <= 0 || row <= 0 || col >= COLS - 1 || row >= ROWS - 1) return false
    // 床
    if (
      col >= BED.col &&
      col < BED.col + BED.width &&
      row >= BED.row &&
      row < BED.row + BED.height
    )
      return false
    // 桌子
    if (
      col >= TABLE.col &&
      col < TABLE.col + TABLE.width &&
      row >= TABLE.row &&
      row < TABLE.row + TABLE.height
    )
      return false
    return true
  }

  blocksArea(left: number, top: number, right: number, bottom: number): boolean {
    const c0 = Math.floor(left / TILE_SIZE)
    const c1 = Math.floor(right / TILE_SIZE)
    const r0 = Math.floor(top / TILE_SIZE)
    const r1 = Math.floor(bottom / TILE_SIZE)

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.isWalkable(c, r)) return true
      }
    }
    return false
  }

  isBed(col: number, row: number): boolean {
    return (
      col >= BED.col &&
      col < BED.col + BED.width &&
      row >= BED.row &&
      row < BED.row + BED.height
    )
  }

  isExit(col: number, row: number): boolean {
    return col === EXIT_COL && row === EXIT_ROW
  }

  draw(scene: Phaser.Scene): void {
    const g = scene.add.graphics()
    g.setDepth(0)

    // 木地板
    g.fillStyle(0xc9a06a, 1)
    g.fillRect(0, 0, INDOOR_WIDTH, INDOOR_HEIGHT)
    g.fillStyle(0xb8905a, 1)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((c + r) % 2 === 0) g.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      }
    }

    // 墙（深色边框）
    g.fillStyle(0x6b4a2a, 1)
    g.fillRect(0, 0, INDOOR_WIDTH, TILE_SIZE)
    g.fillRect(0, 0, TILE_SIZE, INDOOR_HEIGHT)
    g.fillRect(0, INDOOR_HEIGHT - TILE_SIZE, INDOOR_WIDTH, TILE_SIZE)
    g.fillRect(INDOOR_WIDTH - TILE_SIZE, 0, TILE_SIZE, INDOOR_HEIGHT)

    this.drawBed(g)
    this.drawTable(g)
    this.drawExit(g)
  }

  private drawBed(g: Phaser.GameObjects.Graphics): void {
    const x = BED.col * TILE_SIZE
    const y = BED.row * TILE_SIZE
    const w = BED.width * TILE_SIZE
    const h = BED.height * TILE_SIZE

    g.fillStyle(0x8a5a33, 1)
    g.fillRect(x, y, w, h)
    // 枕头
    g.fillStyle(0xf0e8d8, 1)
    g.fillRect(x + 4, y + 4, 28, 16)
    // 被子
    g.fillStyle(0xe06a5a, 1)
    g.fillRect(x, y + 24, w, h - 24)
    g.fillStyle(0xe88a7a, 1)
    g.fillRect(x, y + 40, w, 8)
  }

  private drawTable(g: Phaser.GameObjects.Graphics): void {
    const x = TABLE.col * TILE_SIZE
    const y = TABLE.row * TILE_SIZE
    const w = TABLE.width * TILE_SIZE

    g.fillStyle(0xa9743f, 1)
    g.fillRect(x, y + 8, w, 20)
    g.fillStyle(0x8a5a33, 1)
    g.fillRect(x + 6, y + 28, 8, 24)
    g.fillRect(x + w - 14, y + 28, 8, 24)
  }

  private drawExit(g: Phaser.GameObjects.Graphics): void {
    const x = EXIT_COL * TILE_SIZE
    const y = EXIT_ROW * TILE_SIZE
    g.fillStyle(0x5a3a20, 1)
    g.fillRect(x - 4, y - TILE_SIZE, 40, TILE_SIZE)
    g.fillStyle(0xf0c55a, 1)
    g.fillRect(x + 24, y - TILE_SIZE / 2, 4, 4)
  }
}
