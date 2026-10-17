import type { Chapter, Memo } from './types'

export const mockMemos: Memo[] = [
  {
    id: 'memo-1',
    audioUrl: '/memos/memo-1.m4a',
    transcript:
      'We lived in my grandfather’s house in Tainan. There were twenty of us cousins, all under one roof.',
    createdAt: '2026-10-01T09:30:00Z',
  },
  {
    id: 'memo-2',
    audioUrl: '/memos/memo-2.m4a',
    transcript:
      'Every summer night we dragged our mats onto the courtyard and slept outside because it was too hot.',
    createdAt: '2026-10-02T19:15:00Z',
  },
  {
    id: 'memo-3',
    audioUrl: '/memos/memo-3.m4a',
    transcript:
      'At Lunar New Year my grandmother cooked for three days. We cousins fought over who got to fold the dumplings.',
    createdAt: '2026-10-03T14:05:00Z',
  },
]

export const mockChapters: Chapter[] = [
  {
    id: 'chapter-1',
    title: 'The House with Twenty Cousins',
    stageId: 'stage-1',
    status: 'draft',
    passages: [
      {
        text: 'Mom grew up in her grandfather’s house in Tainan, a wide old home with a tiled roof and a courtyard in the middle. Twenty cousins lived there together, and she was somewhere in the middle of the pack.',
        memoId: 'memo-1',
      },
      {
        text: 'On summer nights the house was too hot to sleep in, so the children carried their bamboo mats out to the courtyard and slept under the stars, whispering until an aunt told them to hush.',
        memoId: 'memo-2',
      },
    ],
  },
  {
    id: 'chapter-2',
    title: 'Lunar New Year in the Courtyard',
    stageId: 'stage-1',
    status: 'draft',
    passages: [
      {
        text: 'Lunar New Year was the biggest event of the year. Grandmother cooked for three days straight, and the whole house smelled of ginger, soy, and frying oil.',
        memoId: 'memo-3',
      },
      {
        text: 'The cousins argued over who got to fold the dumplings. Mom says hers were always the prettiest — though no one else remembers it quite that way.',
        memoId: 'memo-3',
      },
    ],
  },
]
