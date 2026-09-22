import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { HouseScene } from './scenes/HouseScene'
import { store } from './state/store'
import { GAME_WIDTH, GAME_HEIGHT } from './constants'

/**
 * 创建 Phaser 游戏实例并挂载到指定 DOM 容器。
 * 根据存档中的场景决定启动室外还是室内。
 */
export function createGame(parent: string): Phaser.Game {
  const startHouse = store.getState().scene === 'house'
  const scenes: Phaser.Types.Scenes.SceneType[] = startHouse
    ? [HouseScene, GameScene]
    : [GameScene, HouseScene]

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1f2a16',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: scenes,
  })
}
