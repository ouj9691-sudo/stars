import Phaser from 'phaser'
import { FarmMap } from '../world/FarmMap'
import { FarmRenderer } from '../rendering/FarmRenderer'
import { Player, PlayerInput } from '../entities/Player'
import { Npc } from '../entities/Npc'
import { store } from '../state/store'
import { isFarmable } from '../world/mapData'
import { getTimeOverlay } from '../systems/time'
import {
  BUILDINGS,
  CROP_DEFS,
  GAME_WIDTH,
  GAME_HEIGHT,
  HOTBAR_ITEMS,
  NPC_DEFS,
  SEED_TO_CROP,
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ZOOM_STEP,
} from '../constants'
import type { Interaction } from '../types'

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

const INTERACTION_TEXT: Record<Interaction, string> = {
  till: '按 E 锄地',
  plant: '按 E 播种',
  water: '按 E 浇水',
  harvest: '按 E 收获',
  talk: '按 E 对话',
  'enter-house': '按 E 进入房屋',
  'enter-shop': '按 E 进入商店',
  sleep: '按 E 睡觉',
  'exit-house': '按 E 出门',
}

export class GameScene extends Phaser.Scene {
  private map!: FarmMap
  private player!: Player
  private farmRenderer!: FarmRenderer
  private npcs: Npc[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private hintText!: Phaser.GameObjects.Text
  private overlay!: Phaser.GameObjects.Rectangle
  private unsub: (() => void) | null = null
  private saveAccum = 0

  constructor() {
    super('world')
  }

  create(): void {
    this.map = new FarmMap()
    this.map.draw(this)

    const state = store.getState()
    this.player = new Player(
      this,
      this.map,
      state.player.x,
      state.player.y,
      state.player.facing,
    )

    this.farmRenderer = new FarmRenderer(this)
    this.farmRenderer.render(state)

    // NPC
    for (const def of NPC_DEFS) {
      this.npcs.push(new Npc(this, def))
    }

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WasdKeys

    // 交互键用事件驱动，避免场景切换后 JustDown 失效
    const kb = this.input.keyboard!
    kb.addKey('E', true, false).on('down', () => {
      if (!store.isUIOpen()) this.doInteract()
    })
    kb.addKey('ONE', true, false).on('down', () => {
      if (!store.isUIOpen()) store.selectItem(HOTBAR_ITEMS[0])
    })
    kb.addKey('TWO', true, false).on('down', () => {
      if (!store.isUIOpen()) store.selectItem(HOTBAR_ITEMS[1])
    })
    kb.addKey('THREE', true, false).on('down', () => {
      if (!store.isUIOpen()) store.selectItem(HOTBAR_ITEMS[2])
    })
    kb.addKey('FOUR', true, false).on('down', () => {
      if (!store.isUIOpen()) store.selectItem(HOTBAR_ITEMS[3])
    })
    kb.addKey('FIVE', true, false).on('down', () => {
      if (!store.isUIOpen()) store.selectItem(HOTBAR_ITEMS[4])
    })
    kb.addKey('T', true, false).on('down', () => {
      if (!store.isUIOpen()) store.endDay()
    })
    kb.addKey('I', true, false).on('down', () => {
      if (!store.isUIOpen()) store.openBag()
    })

    // 交互提示文字
    this.hintText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#fffbe6',
    })
    this.hintText.setOrigin(0.5, 1)
    this.hintText.setDepth(25)
    this.hintText.setStroke('#3a2a1a', 4)

    // 昼夜 overlay
    this.overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
    this.overlay.setOrigin(0, 0)
    this.overlay.setScrollFactor(0)
    this.overlay.setDepth(15)

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.roundPixels = true
    this.cameras.main.setZoom(store.getState().zoom)

    // 鼠标滚轮缩放
    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objs: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        const step = dy < 0 ? ZOOM_STEP : -ZOOM_STEP
        store.setZoom(store.getState().zoom + step)
      },
    )

    this.unsub = store.subscribe(() => {
      this.farmRenderer.render(store.getState())
      this.cameras.main.setZoom(store.getState().zoom)
    })
  }

  update(_time: number, delta: number): void {
    const uiOpen = store.isUIOpen()

    let input: PlayerInput = { left: false, right: false, up: false, down: false }
    if (!uiOpen) {
      input = {
        left: this.cursors.left.isDown || this.wasd.A.isDown,
        right: this.cursors.right.isDown || this.wasd.D.isDown,
        up: this.cursors.up.isDown || this.wasd.W.isDown,
        down: this.cursors.down.isDown || this.wasd.S.isDown,
      }
    }
    this.player.update(delta, input)

    if (!uiOpen) {
      store.updatePlayer(this.player.sprite.x, this.player.sprite.y, this.player.facingDir)

      for (const npc of this.npcs) npc.facePlayer(this.player.sprite.x, this.player.sprite.y)

      // 移动时定期保存位置（节流），停止时立即保存
      const moving = input.left || input.right || input.up || input.down
      if (moving) {
        this.saveAccum += delta
        if (this.saveAccum >= 2000) {
          this.saveAccum = 0
          store.persist()
        }
      } else if (this.saveAccum > 0) {
        this.saveAccum = 0
        store.persist()
      }

    }

    this.updateHint()
    this.updateOverlay()
  }

  shutdown(): void {
    if (this.unsub) {
      this.unsub()
      this.unsub = null
    }
  }

  private updateOverlay(): void {
    const { color, alpha } = getTimeOverlay(store.getState().time)
    this.overlay.setFillStyle(color, alpha)
  }

  private getTargetTile(): { col: number; row: number } {
    const { x, y } = this.player.sprite
    let col = Math.floor(x / TILE_SIZE)
    let row = Math.floor(y / TILE_SIZE)
    switch (this.player.facingDir) {
      case 'up':
        row -= 1
        break
      case 'down':
        row += 1
        break
      case 'left':
        col -= 1
        break
      case 'right':
        col += 1
        break
    }
    return { col, row }
  }

  private getInteraction(col: number, row: number): Interaction | null {
    // 建筑门
    for (const b of BUILDINGS) {
      if (b.door.col === col && b.door.row === row) {
        return b.id === 'house' ? 'enter-house' : 'enter-shop'
      }
    }
    // NPC
    for (const n of NPC_DEFS) {
      if (n.col === col && n.row === row) return 'talk'
    }

    const state = store.getState()
    const crop = state.crops.find((c) => c.col === col && c.row === row)
    const tile = state.farmTiles.find((t) => t.col === col && t.row === row)

    // 成熟收获优先
    if (crop) {
      const def = CROP_DEFS[crop.type]
      if (crop.stage >= def.growthDays) return 'harvest'
    }

    const selected = state.selectedItem
    if (selected === 'hoe') {
      if (isFarmable(col, row) && !tile) return 'till'
    }
    if (SEED_TO_CROP[selected]) {
      if (tile && !crop) return 'plant'
    }
    if (selected === 'watering-can') {
      if (tile && crop && !tile.watered) return 'water'
    }
    return null
  }

  private updateHint(): void {
    if (store.isUIOpen()) {
      this.hintText.setText('')
      return
    }
    const target = this.getTargetTile()
    let text = ''
    const inter = this.getInteraction(target.col, target.row)
    if (inter === 'plant') {
      const cropType = SEED_TO_CROP[store.getState().selectedItem]
      if (cropType) text = `按 E 播种${CROP_DEFS[cropType].name}`
    } else if (inter) {
      text = INTERACTION_TEXT[inter]
    }
    this.hintText.setText(text)
    this.hintText.setPosition(this.player.sprite.x, this.player.sprite.y - 30)
  }

  private doInteract(): void {
    const target = this.getTargetTile()
    const inter = this.getInteraction(target.col, target.row)
    if (!inter) return

    const { col, row } = target
    switch (inter) {
      case 'till':
        store.till(col, row)
        break
      case 'plant': {
        const cropType = SEED_TO_CROP[store.getState().selectedItem]
        if (cropType) store.plant(col, row, cropType)
        break
      }
      case 'water':
        store.water(col, row)
        break
      case 'harvest':
        store.harvest(col, row)
        break
      case 'talk': {
        const npc = NPC_DEFS.find((n) => n.col === col && n.row === row)
        if (npc) store.openDialog(npc.id)
        break
      }
      case 'enter-house':
        store.enterHouse()
        this.scene.start('house')
        break
      case 'enter-shop':
        store.openShop()
        break
    }
  }
}
