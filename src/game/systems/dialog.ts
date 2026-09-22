// NPC 对话内容，按天数变化，其它日期随机

const DAY_DIALOGUES: Record<number, string[]> = {
  1: ['你好，我是艾米。', '你的农场看起来不错，加油哦！'],
  2: ['记得每天给作物浇水哦。', '浇过水的作物第二天才会成长。'],
  3: ['听说商店今天有新种子。', '去商店看看吧，也许有惊喜。'],
}

const RANDOM_DIALOGUES: string[] = [
  '今天的天气真不错。',
  '种地是个辛苦活，但很有成就感。',
  '收获的季节最让人开心了。',
  '你家的作物长得真好。',
  '有空来商店逛逛，总有你需要的东西。',
]

/** 根据当前天数取对话内容 */
export function getDialogueFor(day: number): string[] {
  return DAY_DIALOGUES[day] ?? RANDOM_DIALOGUES
}
