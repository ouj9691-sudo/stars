import Phaser from 'phaser'
import { TILE_SIZE } from '../constants'
import type { Direction, NpcDef } from '../types'

const TEX_W = 32
const TEX_H = 48

// 艾米调色板
const HAIR = { light: 0xa8743f, base: 0x8a5a33, dark: 0x6e4528 }
const SKIN = { light: 0xf8d8b0, base: 0xf2c79a, dark: 0xdba878 }
const DRESS = { light: 0xee9ac0, base: 0xe07ab0, dark: 0xc86090 }
const SHOES = { base: 0x7a4a2b, dark: 0x5a3a20 }
const EYE = 0x2a1a10
const MOUTH = 0xc07050
const BLUSH = 0xe89a80

/**
 * NPC 实体：程序绘制的像素角色，固定位置，面向玩家，带呼吸待机动画。
 */
export class Npc {
  sprite: Phaser.GameObjects.Sprite
  name: string
  private facing: Direction = 'down'

  constructor(scene: Phaser.Scene, def: NpcDef) {
    this.name = def.name
    Npc.createTextures(scene)
    this.sprite = scene.add.sprite(
      (def.col + 0.5) * TILE_SIZE,
      (def.row + 0.5) * TILE_SIZE,
      'npc-amy-down',
    )
    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setDepth(9)

    // 呼吸待机动画
    scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y + 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  get facingDir(): Direction {
    return this.facing
  }

  facePlayer(playerX: number, playerY: number): void {
    const dx = playerX - this.sprite.x
    const dy = playerY - this.sprite.y
    if (Math.abs(dx) > Math.abs(dy)) {
      this.setFacing(dx > 0 ? 'right' : 'left')
    } else {
      this.setFacing(dy > 0 ? 'down' : 'up')
    }
  }

  private setFacing(f: Direction): void {
    if (this.facing === f) return
    this.facing = f
    if (f === 'up') {
      this.sprite.setTexture('npc-amy-up')
      this.sprite.setFlipX(false)
    } else if (f === 'left' || f === 'right') {
      this.sprite.setTexture('npc-amy-side')
      this.sprite.setFlipX(f === 'left')
    } else {
      this.sprite.setTexture('npc-amy-down')
      this.sprite.setFlipX(false)
    }
  }

  static createTextures(scene: Phaser.Scene): void {
    if (scene.textures.exists('npc-amy-down')) return
    Npc.drawAmy(scene, 'npc-amy-down', 'down')
    Npc.drawAmy(scene, 'npc-amy-up', 'up')
    Npc.drawAmy(scene, 'npc-amy-side', 'side')
  }

  private static drawAmy(scene: Phaser.Scene, key: string, facing: 'down' | 'up' | 'side'): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    const px = (cx: number, cy: number, w: number, h: number, color: number) => {
      g.fillStyle(color, 1)
      g.fillRect(cx * 2, cy * 2, w * 2, h * 2)
    }

    // 地面阴影
    px(4, 22, 8, 1, 0x3a2a1a)

    // 腿 + 鞋
    px(5, 14, 2, 5, 0x5a4632)
    px(9, 14, 2, 5, 0x5a4632)
    px(4, 18, 3, 2, SHOES.base)
    px(4, 18, 1, 2, SHOES.dark)
    px(9, 18, 3, 2, SHOES.base)
    px(9, 18, 1, 2, SHOES.dark)

    // 连衣裙（含身体）
    if (facing === 'side') {
      px(5, 7, 6, 9, DRESS.base)
      px(5, 7, 2, 9, DRESS.dark)
      px(9, 7, 2, 9, DRESS.light)
      // 手臂
      px(4, 7, 1, 4, DRESS.dark)
      px(11, 7, 1, 4, DRESS.base)
      px(4, 11, 1, 1, SKIN.base)
      px(11, 11, 1, 1, SKIN.base)
    } else {
      px(4, 7, 8, 9, DRESS.base)
      px(4, 7, 2, 9, DRESS.dark)
      px(10, 7, 2, 9, DRESS.light)
      px(5, 7, 6, 1, DRESS.dark) // 领口
      // 裙摆高光
      px(5, 11, 6, 1, DRESS.light)
      // 手臂
      px(3, 7, 1, 4, DRESS.dark)
      px(12, 7, 1, 4, DRESS.dark)
      px(3, 11, 1, 1, SKIN.base)
      px(12, 11, 1, 1, SKIN.base)
    }

    // 头 + 长发
    if (facing === 'up') {
      px(4, 2, 8, 6, HAIR.base)
      px(4, 2, 3, 6, HAIR.dark)
      px(9, 2, 3, 6, HAIR.light)
      px(3, 2, 1, 5, HAIR.dark)
      px(12, 2, 1, 5, HAIR.dark)
    } else if (facing === 'side') {
      px(4, 2, 7, 5, SKIN.base)
      px(4, 2, 2, 5, HAIR.base)
      px(4, 2, 1, 5, HAIR.dark)
      px(5, 4, 1, 1, EYE)
      px(8, 5, 1, 1, MOUTH)
      // 侧发垂下
      px(3, 2, 1, 5, HAIR.base)
    } else {
      px(4, 2, 8, 5, SKIN.base)
      px(4, 6, 8, 1, SKIN.dark)
      // 刘海
      px(4, 2, 8, 2, HAIR.base)
      px(4, 2, 3, 2, HAIR.dark)
      px(9, 2, 3, 2, HAIR.light)
      // 两侧长发垂到肩
      px(3, 2, 1, 5, HAIR.base)
      px(3, 2, 1, 2, HAIR.dark)
      px(12, 2, 1, 5, HAIR.base)
      px(12, 2, 1, 2, HAIR.dark)
      // 眼睛
      px(5, 4, 1, 1, EYE)
      px(8, 4, 1, 1, EYE)
      // 嘴 + 腮红
      px(7, 5, 1, 1, MOUTH)
      px(4, 5, 1, 1, BLUSH)
      px(9, 5, 1, 1, BLUSH)
    }

    g.generateTexture(key, TEX_W, TEX_H)
    g.destroy()
  }
}
