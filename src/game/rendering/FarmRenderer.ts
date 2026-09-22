import Phaser from 'phaser'
import { TILE_SIZE, CROP_DEFS } from '../constants'
import type { Crop, FarmTile, GameState } from '../types'

/**
 * 农田渲染器：锄地、浇水以及各阶段作物的像素绘制。
 */
export class FarmRenderer {
  private ground: Phaser.GameObjects.Graphics
  private cropLayer: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.ground = scene.add.graphics()
    this.ground.setDepth(1)
    this.cropLayer = scene.add.graphics()
    this.cropLayer.setDepth(2)
  }

  render(state: GameState): void {
    this.ground.clear()
    this.cropLayer.clear()

    for (const tile of state.farmTiles) {
      this.drawTilled(tile)
      if (tile.watered) this.drawWatered(tile)
    }
    for (const crop of state.crops) {
      this.drawCrop(crop)
    }
  }

  // ---------- 土地 ----------

  private drawTilled(tile: FarmTile): void {
    const x = tile.col * TILE_SIZE
    const y = tile.row * TILE_SIZE
    // 土壤底
    this.ground.fillStyle(0xa8743c, 1)
    this.ground.fillRect(x, y, TILE_SIZE, TILE_SIZE)
    // 垄沟
    this.ground.fillStyle(0x8a5a30, 1)
    for (let i = 5; i < TILE_SIZE; i += 9) {
      this.ground.fillRect(x, y + i, TILE_SIZE, 3)
    }
    // 土块（深浅）
    const h = (tile.col * 7 + tile.row * 13) % 5
    if (h === 0) {
      this.ground.fillStyle(0x8a5a30, 1)
      this.ground.fillRect(x + 6, y + 14, 6, 5)
    }
    if (h === 2) {
      this.ground.fillStyle(0xb8883f, 1)
      this.ground.fillRect(x + 18, y + 22, 6, 4)
    }
    // 边缘阴影
    this.ground.fillStyle(0x7a4a28, 1)
    this.ground.fillRect(x, y, TILE_SIZE, 2)
    this.ground.fillRect(x, y, 2, TILE_SIZE)
  }

  private drawWatered(tile: FarmTile): void {
    const x = tile.col * TILE_SIZE
    const y = tile.row * TILE_SIZE
    // 湿润深色
    this.ground.fillStyle(0x4a3a1f, 0.4)
    this.ground.fillRect(x, y, TILE_SIZE, TILE_SIZE)
    // 水渍高光
    this.ground.fillStyle(0x8fb7c8, 0.35)
    this.ground.fillRect(x + 3, y + 4, 7, 5)
    this.ground.fillRect(x + 16, y + 14, 6, 5)
    this.ground.fillRect(x + 22, y + 22, 6, 4)
  }

  // ---------- 作物 ----------

  private drawCrop(crop: Crop): void {
    const x = crop.col * TILE_SIZE
    const y = crop.row * TILE_SIZE
    const def = CROP_DEFS[crop.type]
    const mature = crop.stage >= def.growthDays
    const seedling = crop.stage === 0

    switch (crop.type) {
      case 'wheat':
        this.drawWheat(x, y, seedling, mature)
        break
      case 'carrot':
        this.drawCarrot(x, y, seedling, mature)
        break
      case 'tomato':
        this.drawTomato(x, y, seedling, mature)
        break
    }
  }

  private drawWheat(x: number, y: number, seedling: boolean, mature: boolean): void {
    const baseY = y + 28
    const h = seedling ? 7 : mature ? 17 : 13
    const stem = mature ? 0xc89838 : 0x3e8a4a
    // 茎秆
    this.cropLayer.fillStyle(stem, 1)
    for (const dx of [-8, -3, 2, 7]) {
      this.cropLayer.fillRect(x + 16 + dx, baseY - h, 2, h)
    }
    // 叶（成长中）
    if (!seedling) {
      this.cropLayer.fillStyle(0x4a9a58, 1)
      this.cropLayer.fillRect(x + 16 - 12, baseY - h + 3, 4, 2)
      this.cropLayer.fillRect(x + 16 + 9, baseY - h + 5, 4, 2)
    }
    if (mature) {
      // 金黄麦穗
      this.cropLayer.fillStyle(0xf0c55a, 1)
      for (const dx of [-9, -4, 1, 6]) {
        this.cropLayer.fillRect(x + 16 + dx, baseY - h - 5, 4, 6)
      }
      this.cropLayer.fillStyle(0xe0b54a, 1)
      for (const dx of [-9, 1]) {
        this.cropLayer.fillRect(x + 16 + dx, baseY - h - 5, 2, 6)
      }
    }
  }

  private drawCarrot(x: number, y: number, seedling: boolean, mature: boolean): void {
    const cx = x + 16
    const baseY = y + 26
    const h = seedling ? 6 : 12
    // 羽状叶
    this.cropLayer.fillStyle(0x3e8a4a, 1)
    this.cropLayer.fillRect(cx - 7, baseY - h, 3, h)
    this.cropLayer.fillRect(cx - 2, baseY - h - 3, 3, h + 3)
    this.cropLayer.fillRect(cx + 4, baseY - h, 3, h)
    if (!seedling) {
      this.cropLayer.fillStyle(0x4a9a58, 1)
      this.cropLayer.fillRect(cx - 10, baseY - h + 2, 3, 2)
      this.cropLayer.fillRect(cx + 7, baseY - h + 4, 3, 2)
    }
    if (mature) {
      // 橙色胡萝卜露出
      this.cropLayer.fillStyle(0xe0703a, 1)
      this.cropLayer.fillRect(cx - 3, baseY - 8, 7, 12)
      this.cropLayer.fillStyle(0xc85a28, 1)
      this.cropLayer.fillRect(cx - 3, baseY - 4, 7, 3)
      this.cropLayer.fillStyle(0x4a9a58, 1)
      this.cropLayer.fillRect(cx - 2, baseY - 12, 3, 4)
    }
  }

  private drawTomato(x: number, y: number, seedling: boolean, mature: boolean): void {
    const cx = x + 16
    const baseY = y + 26
    const h = seedling ? 6 : 14
    // 主茎 + 叶
    this.cropLayer.fillStyle(0x3e8a4a, 1)
    this.cropLayer.fillRect(cx - 1, baseY - h, 4, h)
    this.cropLayer.fillRect(cx - 8, baseY - h + 3, 4, 3)
    this.cropLayer.fillRect(cx + 5, baseY - h + 5, 4, 3)
    if (!seedling) {
      this.cropLayer.fillStyle(0x4a9a58, 1)
      this.cropLayer.fillRect(cx - 8, baseY - h - 1, 3, 2)
      this.cropLayer.fillRect(cx + 6, baseY - h + 1, 3, 2)
      // 支架
      this.cropLayer.fillStyle(0x8a5a33, 1)
      this.cropLayer.fillRect(cx - 5, baseY - h, 2, h)
      this.cropLayer.fillRect(cx + 4, baseY - h, 2, h)
    }
    if (mature) {
      // 红色番茄
      this.cropLayer.fillStyle(0xe03a3a, 1)
      this.cropLayer.fillRect(cx - 6, baseY - 12, 6, 6)
      this.cropLayer.fillRect(cx + 2, baseY - 10, 6, 6)
      this.cropLayer.fillStyle(0xf06050, 1)
      this.cropLayer.fillRect(cx - 5, baseY - 12, 3, 2)
      this.cropLayer.fillRect(cx + 3, baseY - 10, 3, 2)
      this.cropLayer.fillStyle(0x3e8a4a, 1)
      this.cropLayer.fillRect(cx - 5, baseY - 14, 2, 2)
      this.cropLayer.fillRect(cx + 3, baseY - 12, 2, 2)
    }
  }
}
