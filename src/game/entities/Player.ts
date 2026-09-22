import Phaser from 'phaser'
import { PLAYER_SPEED } from '../constants'
import type { CollisionMap, Direction } from '../types'

export interface PlayerInput {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

// 碰撞盒半宽/半高
const HALF_W = 11
const HALF_H = 10

// 贴图尺寸（像素），16×24 网格，每格 2px
const TEX_W = 32
const TEX_H = 48

// 角色调色板
const HAT = { light: 0xf2d878, base: 0xe0b54a, dark: 0xc89838 }
const HAIR = { light: 0xa8743f, base: 0x8a5a33, dark: 0x6e4528 }
const SKIN = { light: 0xf8d8b0, base: 0xf2c79a, dark: 0xdba878 }
const SHIRT = { light: 0x5aa06c, base: 0x4a8c5a, dark: 0x3a7048 }
const PANTS = { base: 0x5a4632, dark: 0x473620 }
const SHOES = { base: 0x7a4a2b, dark: 0x5a3a20 }
const EYE = 0x2a1a10
const MOUTH = 0xc07050
const BLUSH = 0xe89a80

type FarmerFacing = 'down' | 'up' | 'side'

export class Player {
  sprite: Phaser.GameObjects.Sprite
  private map: CollisionMap
  private facing: Direction = 'down'
  private walkFrame = 0
  private walkTimer = 0

  constructor(
    scene: Phaser.Scene,
    map: CollisionMap,
    x: number,
    y: number,
    facing: Direction = 'down',
  ) {
    this.map = map
    Player.createTextures(scene)
    this.sprite = scene.add.sprite(x, y, 'player-down-0')
    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setDepth(10)
    this.facing = facing
    this.applyTexture()
  }

  get facingDir(): Direction {
    return this.facing
  }

  update(delta: number, input: PlayerInput): void {
    let vx = 0
    let vy = 0
    if (input.left) vx -= 1
    if (input.right) vx += 1
    if (input.up) vy -= 1
    if (input.down) vy += 1

    const moving = vx !== 0 || vy !== 0
    if (moving && vx !== 0 && vy !== 0) {
      const inv = 1 / Math.SQRT2
      vx *= inv
      vy *= inv
    }

    const dt = delta / 1000
    this.moveAndCollide(vx * PLAYER_SPEED * dt, vy * PLAYER_SPEED * dt)

    // 朝向
    if (vy < 0) this.facing = 'up'
    else if (vy > 0) this.facing = 'down'
    else if (vx < 0) this.facing = 'left'
    else if (vx > 0) this.facing = 'right'

    // 走路动画帧
    if (moving) {
      this.walkTimer += delta
      if (this.walkTimer >= 170) {
        this.walkTimer = 0
        this.walkFrame = this.walkFrame === 0 ? 1 : 0
      }
    } else {
      this.walkFrame = 0
      this.walkTimer = 0
    }

    this.applyTexture()
  }

  private applyTexture(): void {
    let key: string
    let flip = false
    if (this.facing === 'up') {
      key = `player-up-${this.walkFrame}`
    } else if (this.facing === 'left' || this.facing === 'right') {
      key = `player-side-${this.walkFrame}`
      flip = this.facing === 'left'
    } else {
      key = `player-down-${this.walkFrame}`
    }
    this.sprite.setTexture(key)
    this.sprite.setFlipX(flip)
  }

  private moveAndCollide(dx: number, dy: number): void {
    if (dx !== 0) {
      const nx = this.sprite.x + dx
      if (!this.collidesAt(nx, this.sprite.y)) this.sprite.x = nx
    }
    if (dy !== 0) {
      const ny = this.sprite.y + dy
      if (!this.collidesAt(this.sprite.x, ny)) this.sprite.y = ny
    }
  }

  private collidesAt(cx: number, cy: number): boolean {
    return this.map.blocksArea(cx - HALF_W, cy - HALF_H, cx + HALF_W, cy + HALF_H)
  }

  // ---------- 贴图生成 ----------

  static createTextures(scene: Phaser.Scene): void {
    if (scene.textures.exists('player-down-0')) return
    Player.drawFarmer(scene, 'player-down-0', 'down', 0)
    Player.drawFarmer(scene, 'player-down-1', 'down', 1)
    Player.drawFarmer(scene, 'player-up-0', 'up', 0)
    Player.drawFarmer(scene, 'player-up-1', 'up', 1)
    Player.drawFarmer(scene, 'player-side-0', 'side', 0)
    Player.drawFarmer(scene, 'player-side-1', 'side', 1)
    Player.drawSleep(scene)
    Player.drawSit(scene)
  }

  private static drawFarmer(
    scene: Phaser.Scene,
    key: string,
    facing: FarmerFacing,
    frame: number,
  ): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    const px = (cx: number, cy: number, w: number, h: number, color: number) => {
      g.fillStyle(color, 1)
      g.fillRect(cx * 2, cy * 2, w * 2, h * 2)
    }

    // 身体阴影（地面）
    px(4, 22, 8, 1, 0x3a2a1a)

    // ---- 腿与鞋（frame 交替前后）----
    const backShoe = frame === 0 ? 1 : 0 // 后退那只鞋略高
    Player.drawLegs(px, backShoe)

    // ---- 身体（上衣，侧向时略窄）----
    if (facing === 'side') {
      px(5, 8, 6, 8, SHIRT.base) // 侧面身体
      px(5, 8, 2, 8, SHIRT.dark) // 阴影
      px(9, 8, 2, 8, SHIRT.light) // 高光
    } else {
      px(4, 8, 8, 7, SHIRT.base)
      px(4, 8, 2, 7, SHIRT.dark)
      px(10, 8, 2, 7, SHIRT.light)
      // 衣领
      px(6, 8, 4, 1, SHIRT.dark)
    }

    // ---- 手臂（frame 摆动）----
    if (facing === 'side') {
      const swing = frame === 0 ? 0 : 1
      px(4, 8 + swing, 1, 4, SHIRT.dark) // 后侧手臂
      px(11, 8, 1, 4, SHIRT.base)
      px(4, 11 + swing, 1, 1, SKIN.base)
      px(11, 11, 1, 1, SKIN.base)
    } else {
      const swing = frame === 0 ? 0 : 1
      px(3, 8, 1, 4, SHIRT.dark)
      px(12, 8, 1, 4, SHIRT.dark)
      px(3, 11 + swing, 1, 1, SKIN.base)
      px(12, 11 + swing, 1, 1, SKIN.base)
    }

    // ---- 头 ----
    if (facing === 'up') {
      // 背面：头发遮住
      px(4, 3, 8, 5, HAIR.base)
      px(4, 3, 3, 5, HAIR.dark)
      px(9, 3, 3, 5, HAIR.light)
      px(3, 3, 1, 4, HAIR.dark)
      px(12, 3, 1, 4, HAIR.dark)
    } else if (facing === 'side') {
      px(4, 3, 7, 5, SKIN.base) // 脸
      px(4, 3, 2, 5, HAIR.base) // 后脑头发
      px(4, 3, 1, 5, HAIR.dark)
      px(6, 5, 1, 1, EYE) // 一只眼
      px(8, 6, 1, 1, MOUTH)
    } else {
      // 正面
      px(4, 3, 8, 5, SKIN.base)
      px(4, 7, 8, 1, SKIN.dark) // 下巴阴影
      px(4, 3, 2, 4, HAIR.base) // 两侧头发
      px(10, 3, 2, 4, HAIR.base)
      px(4, 3, 1, 4, HAIR.dark)
      px(11, 3, 1, 4, HAIR.dark)
      // 眼睛
      px(5, 5, 1, 1, EYE)
      px(8, 5, 1, 1, EYE)
      // 嘴
      px(7, 6, 1, 1, MOUTH)
      // 腮红
      px(4, 6, 1, 1, BLUSH)
      px(9, 6, 1, 1, BLUSH)
    }

    // ---- 草帽（所有方向）----
    px(4, 0, 8, 2, HAT.base)
    px(5, 0, 6, 1, HAT.light)
    px(4, 1, 2, 1, HAT.dark)
    px(3, 2, 10, 1, HAT.base) // 帽檐
    px(3, 2, 1, 1, HAT.dark)
    px(12, 2, 1, 1, HAT.dark)

    g.generateTexture(key, TEX_W, TEX_H)
    g.destroy()
  }

  private static drawLegs(
    px: (cx: number, cy: number, w: number, h: number, color: number) => void,
    backShoe: number,
  ): void {
    // 左腿
    px(5, 14, 2, 5, PANTS.base)
    // 右腿
    px(9, 14, 2, 5, PANTS.base)
    // 裤子阴影
    px(5, 14, 1, 5, PANTS.dark)
    px(9, 14, 1, 5, PANTS.dark)
    // 鞋（后退的略高）
    const leftY = backShoe === 0 ? 18 : 19
    const rightY = backShoe === 0 ? 19 : 18
    px(4, leftY, 3, 2, SHOES.base)
    px(4, leftY, 1, 2, SHOES.dark)
    px(9, rightY, 3, 2, SHOES.base)
    px(9, rightY, 1, 2, SHOES.dark)
  }

  private static drawSleep(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    const px = (cx: number, cy: number, w: number, h: number, color: number) => {
      g.fillStyle(color, 1)
      g.fillRect(cx * 2, cy * 2, w * 2, h * 2)
    }
    // 枕头
    px(1, 6, 4, 3, 0xf0e8d8)
    // 头 + 草帽（朝左）
    px(1, 3, 3, 2, HAT.base)
    px(1, 5, 3, 2, SKIN.base)
    px(2, 5, 2, 1, EYE)
    // 身体（横躺）
    px(4, 5, 6, 3, SHIRT.base)
    px(4, 5, 1, 3, SHIRT.dark)
    px(4, 8, 6, 1, SHIRT.dark)
    // 腿
    px(10, 5, 4, 3, PANTS.base)
    px(10, 5, 1, 3, PANTS.dark)
    // 被子
    px(3, 9, 11, 3, 0xe06a5a)
    px(3, 9, 11, 1, 0xe88a7a)

    g.generateTexture('player-sleep', 32, 24)
    g.destroy()
  }

  private static drawSit(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    const px = (cx: number, cy: number, w: number, h: number, color: number) => {
      g.fillStyle(color, 1)
      g.fillRect(cx * 2, cy * 2, w * 2, h * 2)
    }
    // 草帽
    px(4, 0, 8, 2, HAT.base)
    px(5, 0, 6, 1, HAT.light)
    px(3, 2, 10, 1, HAT.base)
    // 脸
    px(4, 3, 8, 4, SKIN.base)
    px(5, 5, 1, 1, EYE)
    px(8, 5, 1, 1, EYE)
    px(7, 6, 1, 1, MOUTH)
    // 身体（坐起）
    px(4, 7, 8, 4, SHIRT.base)
    px(4, 7, 2, 4, SHIRT.dark)
    px(10, 7, 2, 4, SHIRT.light)
    // 腿（往前伸）
    px(4, 11, 9, 3, PANTS.base)
    px(4, 11, 2, 3, PANTS.dark)
    // 鞋
    px(4, 13, 3, 2, SHOES.base)
    px(11, 13, 3, 2, SHOES.base)

    g.generateTexture('player-sit', TEX_W, TEX_H)
    g.destroy()
  }
}
