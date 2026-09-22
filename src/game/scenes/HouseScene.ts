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

// 睡觉状态机阶段
type SleepPhase = 'idle' | 'walk' | 'fade-out' | 'black' | 'fade-in' | 'wake'

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
  private sleepPhase: SleepPhase = 'idle'
  private sleepTimer = 0
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

    // 交互键用 window 原生事件，避免场景切换后 Phaser Key 事件失效
    const kb = this.input.keyboard!
    kb.addKey('T', true, false).on('down', () => {
      if (this.sleeping || store.isUIOpen()) return
      store.endDay()
    })
    kb.addKey('I', true, false).on('down', () => {
      if (this.sleeping || store.isUIOpen()) return
      store.openBag()
    })
    window.addEventListener('keydown', this.handleKeyDown)

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
      if (this.cameras?.main) {
        this.cameras.main.setZoom(store.getState().zoom)
      }
    })
  }

  shutdown(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    if (this.unsub) {
      this.unsub()
      this.unsub = null
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault()
      if (!this.scene.isActive()) return
      console.log('[INPUT] E PRESSED', {
        sleeping: this.sleeping,
        uiOpen: store.isUIOpen(),
      })
      if (this.sleeping || store.isUIOpen()) return
      this.doInteract()
    }
  }

  update(_time: number, delta: number): void {
    // 睡觉流程中：由状态机驱动，禁止移动/交互/提示
    if (this.sleeping) {
      this.updateSleep(delta)
      return
    }

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

  /** 寻找附近可交互目标：朝向优先，其次最近出口/床 */
  private findInteractTarget(): { col: number; row: number; interaction: HouseInteraction } | null {
    const pc = Math.floor(this.player.sprite.x / TILE_SIZE)
    const pr = Math.floor(this.player.sprite.y / TILE_SIZE)

    const facing = this.getTargetTile()
    const facingInter = this.getInteraction(facing.col, facing.row)
    if (facingInter) return { col: facing.col, row: facing.row, interaction: facingInter }

    const neighbors: Array<[number, number]> = [
      [pc, pr - 1],
      [pc, pr + 1],
      [pc - 1, pr],
      [pc + 1, pr],
      [pc - 1, pr - 1],
      [pc + 1, pr - 1],
      [pc - 1, pr + 1],
      [pc + 1, pr + 1],
    ]
    for (const [c, r] of neighbors) {
      const inter = this.getInteraction(c, r)
      if (inter) return { col: c, row: r, interaction: inter }
    }
    return null
  }

  private updateHint(): void {
    if (store.isUIOpen()) {
      this.hintText.setText('')
      return
    }
    const target = this.findInteractTarget()
    this.hintText.setText(target ? INTERACTION_TEXT[target.interaction] : '')
    this.hintText.setPosition(this.player.sprite.x, this.player.sprite.y - 30)
  }

  private doInteract(): void {
    console.log('[INTERACTION] player', {
      x: Math.floor(this.player.sprite.x / TILE_SIZE),
      y: Math.floor(this.player.sprite.y / TILE_SIZE),
      facing: this.player.facingDir,
    })
    const target = this.findInteractTarget()
    console.log('[INTERACTION] nearest target=', target ? target.interaction : 'none')
    if (!target) return

    if (target.interaction === 'sleep') {
      this.startSleep()
    } else if (target.interaction === 'exit-house') {
      store.exitHouse()
      this.scene.start('world')
    }
  }

  // ---------- 睡觉流程（状态机 + delta 累积驱动，不依赖 tween/delayedCall 回调链） ----------

  private startSleep(): void {
    if (this.sleeping) return
    console.log('[Sleep] START')
    this.sleeping = true
    this.sleepPhase = 'walk'
    this.sleepTimer = 0
    this.hintText.setText('')

    // 走向床边（tween 仅做视觉移动，流程由状态机定时推进）
    this.tweens.add({
      targets: this.player.sprite,
      x: BED_CENTER_X,
      y: BED_APPROACH_Y,
      duration: 450,
      ease: 'Linear',
    })
  }

  private updateSleep(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return
    this.sleepTimer += delta

    switch (this.sleepPhase) {
      case 'walk':
        if (this.sleepTimer >= 450) {
          console.log('[Sleep] WALK_COMPLETE -> PLAYER_ON_BED')
          this.lieDown()
          this.sleepPhase = 'fade-out'
          this.sleepTimer = 0
        }
        break
      case 'fade-out':
        this.sleepOverlay.alpha = Math.min(1, this.sleepTimer / 2000)
        if (this.sleepTimer >= 900) this.goodnightText.setVisible(true)
        if (this.sleepTimer >= 2000) {
          this.sleepOverlay.alpha = 1
          this.goodnightText.setVisible(false)
          console.log('[Sleep] NIGHT_FADE_COMPLETE -> ADVANCE_DAY')
          this.advanceDay()
          this.sleepPhase = 'black'
          this.sleepTimer = 0
        }
        break
      case 'black':
        if (this.sleepTimer >= 700) {
          console.log('[Sleep] BLACK_END -> MORNING_FADE_START')
          this.dayText.setVisible(true)
          this.sleepPhase = 'fade-in'
          this.sleepTimer = 0
        }
        break
      case 'fade-in':
        this.sleepOverlay.alpha = Math.max(0, 1 - this.sleepTimer / 1800)
        if (this.sleepTimer >= 1800) {
          this.sleepOverlay.alpha = 0
          this.dayText.setVisible(false)
          console.log('[Sleep] MORNING_FADE_COMPLETE -> WAKE_START')
          this.sitUp()
          this.sleepPhase = 'wake'
          this.sleepTimer = 0
        }
        break
      case 'wake':
        if (this.sleepTimer >= 450) {
          console.log('[Sleep] WAKE_COMPLETE -> INPUT_ENABLED')
          this.finishWake()
          this.sleeping = false
          this.sleepPhase = 'idle'
        }
        break
      default:
        // 异常状态，强制恢复，避免永久冻结
        console.warn('[Sleep] UNKNOWN_PHASE, force reset:', this.sleepPhase)
        this.sleepOverlay.alpha = 0
        this.goodnightText.setVisible(false)
        this.dayText.setVisible(false)
        this.sleeping = false
        this.sleepPhase = 'idle'
        break
    }
  }

  private lieDown(): void {
    this.player.sprite.setTexture('player-sleep')
    this.player.sprite.setFlipX(false)
    this.player.sprite.setPosition(BED_CENTER_X, BED_LYING_Y)
    console.log('[Sleep] PLAYER_ON_BED at', BED_CENTER_X, BED_LYING_Y)
  }

  private advanceDay(): void {
    // 进入下一天（原地过天，不切换场景）
    store.endDay()
    const state = store.getState()
    this.dayText.setText(`Day ${state.day}\n早晨`)
    console.log('[Sleep] ADVANCE_DAY -> DAY =', state.day)
  }

  private sitUp(): void {
    this.player.sprite.setTexture('player-sit')
    this.player.sprite.setPosition(BED_CENTER_X, BED_LYING_Y + 16)
    console.log('[Sleep] SIT_UP')
  }

  private finishWake(): void {
    this.player.sprite.setTexture('player-down-0')
    this.player.sprite.setFlipX(false)
    this.player.sprite.setPosition(BED_CENTER_X, BED_APPROACH_Y)
    console.log('[Sleep] WAKE_POSITION at', BED_CENTER_X, BED_APPROACH_Y)

    store.updatePlayer(this.player.sprite.x, this.player.sprite.y, 'up')
    store.persist()

    this.wakeText.setVisible(true)
    this.time.delayedCall(2000, () => {
      this.wakeText.setVisible(false)
    })
  }
}
