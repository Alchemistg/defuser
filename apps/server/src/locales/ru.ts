export const ru = {
  defaults: {
    playerName: 'Игрок',
    playerNameSecond: 'Игрок 2'
  },
  errors: {
    roomNotFound: 'Комната не найдена',
    roomFull: 'Комната уже заполнена',
    ownerOnlyStart: 'Только владелец комнаты может начать игру',
    ownerOnlyRestart: 'Только владелец комнаты может перезапустить раунд',
    ownerOnlySettings: 'Только владелец комнаты может менять настройки',
    needSecondPlayerStart: 'Для старта нужен второй игрок',
    needSecondPlayerRestart: 'Для нового раунда нужен второй игрок',
    gameAlreadyStarted: 'Игра уже запущена',
    settingsLobbyOnly: 'Настройки можно менять только в лобби',
    playerNotFound: 'Игрок не найден',
    onlySapper: 'Только сапер может выполнять действия',
    gameInactive: 'Игра сейчас неактивна',
    moduleNotFound: 'Модуль не найден'
  },
  routes: {
    createRoomFail: 'Не удалось создать комнату',
    joinRoomFail: 'Не удалось войти в комнату',
    startGameFail: 'Не удалось запустить игру',
    restartGameFail: 'Не удалось подготовить новый раунд',
    updateSettingsFail: 'Не удалось обновить настройки',
    playerIdRequired: 'Нужен playerId',
    roomNotFound: 'Комната не найдена'
  },
  messages: {
    gameStarted: 'Игра началась. Координатор читает инструкцию, сапер работает с панелью.',
    roundRestarted: 'Раунд сброшен. Комната снова в лобби, можно начинать заново.',
    settingsUpdated: 'Настройки комнаты обновлены.',
    playerBackOnline: (name: string) => `${name} снова на связи.`,
    playerDisconnected: (name: string) => `${name} отключился.`,
    timeExpired: 'Время вышло. Бомба взорвалась.',
    moduleAlreadyDefused: 'Этот модуль уже обезврежен.',
    moduleDefused: (label: string) => `Модуль ${label} обезврежен.`,
    moduleDefusedBombSaved: (label: string) => `Модуль ${label} обезврежен. Бомба спасена.`,
    criticalError: 'Критическая ошибка. Бомба взорвалась.',
    remainingAttempts: (count: number) => `Ошибка. Осталось попыток: ${count}.`
  },
  module: {
    templates: {
      wires: [
        {
          label: 'Провода A',
          sapperLines: ['На панели 3 провода.', 'Слева направо: красный, синий, желтый.'],
          coordinatorLines: [
            'Правило 1: если 3 провода и есть красный, режь синий.',
            'Правило 2: если 3 провода без красного, режь последний.'
          ],
          actions: [
            { action: 'cut-wire', label: 'Резать красный', value: '0' },
            { action: 'cut-wire', label: 'Резать синий', value: '1' },
            { action: 'cut-wire', label: 'Резать желтый', value: '2' }
          ],
          solution: { action: 'cut-wire', value: '1' }
        },
        {
          label: 'Провода B',
          sapperLines: ['На панели 4 провода.', 'Слева направо: белый, черный, красный, черный.'],
          coordinatorLines: [
            'Правило 1: если 4 провода и последний черный, режь третий.',
            'Правило 2: если 4 провода и последний не черный, режь первый.'
          ],
          actions: [
            { action: 'cut-wire', label: 'Резать белый', value: '0' },
            { action: 'cut-wire', label: 'Резать черный #2', value: '1' },
            { action: 'cut-wire', label: 'Резать красный', value: '2' },
            { action: 'cut-wire', label: 'Резать черный #4', value: '3' }
          ],
          solution: { action: 'cut-wire', value: '2' }
        }
      ],
      button: [
        {
          label: 'Кнопка A',
          sapperLines: ['Большая синяя кнопка.', 'Текст на кнопке: HOLD.'],
          coordinatorLines: ['Если синяя и текст HOLD, удерживай 2 секунды.', 'Иначе удерживай 2 секунды.'],
          actions: [{ action: 'hold-button', label: 'Удерживать кнопку 2 сек' }],
          solution: { action: 'hold-button' }
        },
        {
          label: 'Кнопка B',
          sapperLines: ['Большая красная кнопка.', 'Текст на кнопке: WAIT.'],
          coordinatorLines: ['Если красная и текст WAIT, удерживай 2 секунды.', 'Иначе удерживай 2 секунды.'],
          actions: [{ action: 'hold-button', label: 'Удерживать кнопку 2 сек' }],
          solution: { action: 'hold-button' }
        }
      ],
      toggles: [
        {
          label: 'Тумблеры A',
          sapperLines: ['Три тумблера.', 'Положение: верхний вверх, средний вниз, нижний вверх.'],
          coordinatorLines: ['Если крайние вверх — щелкни средний.', 'Если крайние не вверх — сообщи позиции.'],
          actions: [
            { action: 'tap-toggle', label: 'Щелкнуть верхний', value: '0' },
            { action: 'tap-toggle', label: 'Щелкнуть средний', value: '1' },
            { action: 'tap-toggle', label: 'Щелкнуть нижний', value: '2' }
          ],
          solution: { action: 'tap-toggle', value: '1' }
        },
        {
          label: 'Тумблеры B',
          sapperLines: ['Три тумблера.', 'Положение: верхний вниз, средний вниз, нижний вверх.'],
          coordinatorLines: ['Если только нижний вверх — щелкни нижний.', 'Если иначе — сообщи позиции.'],
          actions: [
            { action: 'tap-toggle', label: 'Щелкнуть верхний', value: '0' },
            { action: 'tap-toggle', label: 'Щелкнуть средний', value: '1' },
            { action: 'tap-toggle', label: 'Щелкнуть нижний', value: '2' }
          ],
          solution: { action: 'tap-toggle', value: '2' }
        }
      ]
    },
    text: {
      symbols: {
        label: 'Символы',
        sapperIntro: 'Экран с 4 символами.',
        sapperOrder: (symbols: string[]) => `Слева направо: ${symbols.join(', ')}.`,
        coordinatorLines: ['Если есть ★, нажми кнопку со звездой.', 'Если ★ нет, нажми 2-ю кнопку.'],
        actions: ['Нажать 1-ю', 'Нажать 2-ю', 'Нажать 3-ю', 'Нажать 4-ю']
      },
      lamps: {
        label: 'Лампочки',
        sapperIntro: '5 лампочек по кругу.',
        sapperLit: (lit: number[]) => `Горят: ${lit.join(', ')}.`,
        coordinatorLines: [
          'Если горят 3 лампы, выключи среднюю (3-ю).',
          'Если горят 2 лампы, выключи верхнюю (1-ю).'
        ],
        actions: ['Переключить 1', 'Переключить 2', 'Переключить 3', 'Переключить 4', 'Переключить 5']
      },
      disk: {
        label: 'Диск',
        sapperIntro: 'Круглый диск с меткой.',
        sapperPosition: (position: number) => `Метка смотрит на ${position} часов.`,
        coordinatorLines: [
          'Если метка на 9 часов, поверни вправо.',
          'Если метка на 12 часов, поверни вниз.',
          'Если метка на 3 часа, поверни влево.',
          'Если метка на 6 часов, поверни вверх.'
        ],
        actions: {
          up: 'Повернуть вверх',
          down: 'Повернуть вниз',
          left: 'Повернуть влево',
          right: 'Повернуть вправо'
        }
      }
    }
  }
} as const;
