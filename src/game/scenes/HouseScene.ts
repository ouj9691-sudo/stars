import Phaser from 'phaser'
import {
  IndoorMap,
  INDOOR_WIDTH,
  INDOOR_HEIGHT,
  BED_CENTER_X,
  BED_LYING_Y,
  BED_APPROACH_Y,
} from '../world/IndoorMap'
import { Player, PlayerInput } from '../entities/Player'
import { store } from '../state/store'
import { getTimeOverlay } from '../systems/time'
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, ZOOM_STEP } from '../constants'

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

type HouseInteraction = 'sleep' | 'exit-house'

const INTERACTION_TEXT: Record<HouseInteraction, string> = {
  sleep: '按 E 睡觉',
  'exit-house': '按 E 出门',
}

const SLEEP_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '20px',
  color: '#fffbe6',
}

export class HouseScene extends Phaser.Scene {
  private indoor!: IndoorMap
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private hintText!: Phaser.GameObjects.Text
  private overlay!: Phaser.GameObjects.Rectangle
  private sleepOverlay!: Phaser.GameObjects.Rectangle
  private goodnightText!: Phaser.GameObjects.Text
  private dayText!: Phaser.GameObjects.Text
  private wakeText!: Phaser.GameObjects.Text
  private saveAccum = 0
  private sleeping = false
  private unsub: (() => void) | null = null

  constructor() {
    super('house')
  }

  create(): void {
    this.indoor = new IndoorMap()
    this.indoor.draw(this)

    const state = store.getState()
    this.player = new Player(
      this,
      this.indoor,
      state.player.x,
      state.player.y,
      state.player.facing,
    )

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WasdKeys

    // 交互键用事件驱动，避免场景切换后 JustDown 失效
    const kb = this.input.keyboard!
    kb.addKey('E', true, false).on('down', () => {
      if (this.sleeping || store.isUIOpen()) return
      this.doInteract()
    })
    kb.addKey('T', true, false).on('down', () => {
      if (this.sleeping || store.isUIOpen()) return
      store.endDay()
    })
    kb.addKey('I', true, false).on('down', () => {
      if (this.sleeping || store.isUIOpen()) return
      store.openBag()
    })

    // 交互提示
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
    this.overlay.setOrigin(0, 0).setScrollFactor(0).setDepth(15)

    // 睡觉黑屏 overlay（fillAlpha 固定 1，用 GameObject.alpha 做渐变）
    this.sleepOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0f1e, 1)
    this.sleepOverlay.setOrigin(0, 0).setScrollFactor(0).setDepth(30).setAlpha(0)

    // 睡觉流程提示文字
    this.goodnightText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '晚安……', SLEEP_TEXT_STYLE)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(35)
      .setVisible(false)

    this.dayText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      ...SLEEP_TEXT_STYLE,
      align: 'center',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(35)
      .setVisible(false)

    this.wakeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '新的一天开始了', {
      ...SLEEP_TEXT_STYLE,
      fontSize: '14px',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(35)
      .setVisible(false)

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.cameras.main.setBounds(0, 0, INDOOR_WIDTH, INDOOR_HEIGHT)
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
      this.cameras.main.setZoom(store.getState().zoom)
    })
  }

  shutdown(): void {
    if (this.unsub) {
      this.unsub()
      this.unsub = null
    }
  }

  update(_time: number, delta: number): void {
    // 睡觉流程中：禁止移动、交互、提示与昼夜 overlay（由睡觉动画接管）
    if (this.sleeping) return

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

  private getInteraction(col: number, row: number): HouseInteraction | null {
    if (this.indoor.isExit(col, row)) return 'exit-house'
    if (this.indoor.isBed(col, row)) return 'sleep'
    return null
  }

  private updateHint(): void {
    if (store.isUIOpen()) {
      this.hintText.setText('')
      return
    }
    const target = this.getTargetTile()
    const inter = this.getInteraction(target.col, target.row)
    this.hintText.setText(inter ? INTERACTION_TEXT[inter] : '')
    this.hintText.setPosition(this.player.sprite.x, this.player.sprite.y - 30)
  }

  private doInteract(): void {
    const target = this.getTargetTile()
    const inter = this.getInteraction(target.col, target.row)
    if (!inter) return

    if (inter === 'sleep') {
      this.startSleep()
    } else if (inter === 'exit-house') {
      store.exitHouse()
      this.scene.start('world')
    }
  }

  // ---------- 睡觉流程 ----------

  private startSleep(): void {
    if (this.sleeping) return
    this.sleeping = true
    this.hintText.setText('')

    // 走向床边
    this.tweens.add({
      targets: this.player.sprite,
      x: BED_CENTER_X,
      y: BED_APPROACH_Y,
      duration: 450,
      ease: 'Linear',
      onComplete: () => this.lieDown(),
    })
  }

  private lieDown(): void {
    // 躺下
    this.player.sprite.setTexture('player-sleep')
    this.player.sprite.setFlipX(false)
    this.player.sprite.setPosition(BED_CENTER_X, BED_LYING_Y)

    // 逐渐变暗（约 2 秒）
    this.tweens.add({
      targets: this.sleepOverlay,
      alpha: 1,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => this.atBlack(),
    })

    // 变暗中途显示晚安
    this.time.delayedCall(900, () => {
      this.goodnightText.setVisible(true)
    })
  }

  private atBlack(): void {
    this.goodnightText.setVisible(false)

    // 进入下一天（原地过天，不切换场景）
    store.endDay()

    const state = store.getState()
    this.dayText.setText(`Day ${state.day}\n早晨`)
    this.dayText.setVisible(true)

    // 短暂黑屏停留后清晨亮屏
    this.time.delayedCall(700, () => {
      this.tweens.add({
        targets: this.sleepOverlay,
        alpha: 0,
        duration: 1800,
        ease: 'Linear',
        onComplete: () => {
          this.dayText.setVisible(false)
          this.wakeUp()
        },
      })
    })
  }

  private wakeUp(): void {
    // 坐起
    this.player.sprite.setTexture('player-sit')
    this.player.sprite.setPosition(BED_CENTER_X, BED_LYING_Y + 16)

    this.time.delayedCall(450, () => {
      // 站起并离开床边
      this.player.sprite.setTexture('player-down-0')
      this.player.sprite.setFlipX(false)
      this.player.sprite.setPosition(BED_CENTER_X, BED_APPROACH_Y)

      // 同步位置到存档
      store.updatePlayer(this.player.sprite.x, this.player.sprite.y, 'up')
      store.persist()

      // 提示并恢复控制
      this.wakeText.setVisible(true)
      this.time.delayedCall(2000, () => {
        this.wakeText.setVisible(false)
      })

      this.sleeping = false
    })
  }
}
