export const ru = {
  defaults: {
    randomNamePrefix: 'Игрок'
  },
  api: {
    requestError: (status: number) => `Ошибка запроса (${status})`,
    emptyResponse: 'Ответ сервера пустой или не в формате JSON'
  },
  app: {
    badge: 'Кооперативный режим',
    title: 'Сапер и Координатор',
    subtitle: 'Асимметричная игра на двоих: сапер видит панель бомбы, координатор — только инструкцию и время.',
    modeLabel: 'РЕЖИМ',
    modeValue: '2 игрока',
    sessionLabel: 'СЕССИЯ',
    sessionValue: '2-5 минут',
    formatLabel: 'ФОРМАТ',
    formatValue: 'Сайт + ссылка'
  },
  status: {
    label: 'СТАТУС СИСТЕМЫ',
    ready: 'Готов к запуску',
    socketPrefix: 'P2P:',
    socketConnected: 'connected',
    socketWaiting: 'waiting',
    roomStates: {
      lobby: 'Сбор команды',
      active: 'Разминирование',
      defused: 'Бомба обезврежена',
      exploded: 'Бомба взорвалась'
    },
  },
  pwa: {
    label: 'PWA',
    offlineReady: 'Приложение готово к работе офлайн.',
    updateReady: 'Доступно обновление приложения.',
    refresh: 'Обновить',
    dismiss: 'Закрыть'
  },
  lobby: {
    createTitle: 'Создать комнату',
    createHint: 'Создайте комнату и отправьте напарнику ссылку или код.',
    joinTitle: 'Войти по коду',
    joinHint: 'Введите код комнаты или откройте приглашение.',
    nameLabel: 'Ваше имя',
    namePlaceholderCreate: 'Например, Алина',
    namePlaceholderJoin: 'Например, Макс',
    codeLabel: 'Код комнаты',
    codePlaceholder: 'AB12',
    createButton: 'Создать комнату',
    createButtonLoading: 'Создаем...',
    joinButton: 'Войти в комнату',
    joinButtonLoading: 'Подключаем...'
  },
  room: {
    label: 'КОМНАТА',
    inviteLabel: 'ССЫЛКА-ПРИГЛАШЕНИЕ',
    inviteCopy: 'Скопировать ссылку',
    leave: 'Выйти'
  },
  role: {
    label: 'ВАША РОЛЬ',
    pending: 'Ожидает назначения',
    names: {
      sapper: 'Сапер',
      coordinator: 'Координатор'
    },
    sapper: 'Вы видите настоящую панель. Слушайте координатора и аккуратно выполняйте его команды.',
    coordinator: 'Вы видите только инструкцию. Давайте правила саперу и следите за таймером.',
    unknown: 'После старта роли распределятся автоматически.'
  },
  lobbySettings: {
    title: 'Лобби готовности',
    hint: 'Нужно два игрока. Владелец запускает матч.',
    durationLabel: 'Время раунда',
    duration2: '2 минуты',
    duration3: '3 минуты',
    duration4: '4 минуты',
    duration5: '5 минут',
    modulesLabel: 'Кол-во модулей',
    modules3: '3 модуля',
    modules4: '4 модуля',
    modules5: '5 модулей',
    modules6: '6 модулей',
    moduleTypesLabel: 'Типы модулей',
    moduleTypesHint: 'Нужно оставить хотя бы один тип.',
    saveSettings: 'Сохранить настройки',
    saveSettingsLoading: 'Сохраняем...',
    startGame: 'Начать разминирование',
    startGameLoading: 'Стартуем...',
    waitPlayer: 'Ждем второго игрока',
    ownerOnly: 'Настройки меняет владелец комнаты.'
  },
  hud: {
    timer: 'ТАЙМЕР',
    strikes: 'Удары'
  },
  results: {
    label: 'ИТОГ РАУНДА',
    defusedTitle: 'Бомба обезврежена',
    defusedBody: 'Команда справилась. Можно выдохнуть и запускать следующий раунд.',
    explodedTitle: 'Бомба взорвалась',
    explodedBody: 'Раунд закончен. Ошибка или время привели к взрыву.',
    time: 'ВРЕМЯ',
    strikes: 'УДАРЫ',
    rematch: 'Сыграть еще раз',
    rematchLoading: 'Готовим...',
    ownerStarts: 'Новый раунд запустит владелец комнаты.'
  },
  bomb: {
    label: 'БОМБА',
    serialPrefix: 'Серия',
    notReady: 'Система не инициализирована',
    emptyHint: 'После старта здесь появится панель сапера или инструкция координатора.'
  },
  messages: {
    default: 'Создайте комнату или подключитесь по коду.',
    roomLoaded: 'Состояние комнаты загружено.',
    roomCreated: 'Комната создана. Поделитесь ссылкой или кодом с напарником.',
    joinSuccess: 'Подключение к комнате прошло успешно.',
    startSuccess: 'Матч запущен. Проверьте свою роль.',
    settingsSaved: 'Настройки обновлены.',
    restartReady: 'Раунд сброшен. Комната снова готова к запуску.',
    inviteCopied: 'Ссылка-приглашение скопирована.',
    inviteCopyFail: 'Не удалось скопировать ссылку. Скопируйте ее вручную из поля ниже.',
    sessionReset: 'Локальная сессия очищена. Можно зайти заново.',
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
    remainingAttempts: (count: number) => `Ошибка. Осталось попыток: ${count}.`,
  },
  errors: {
    roomLoad: 'Не удалось загрузить комнату',
    roomCreate: 'Не удалось создать комнату',
    roomJoin: 'Не удалось войти в комнату',
    gameStart: 'Не удалось запустить игру',
    settings: 'Не удалось обновить настройки',
    restart: 'Не удалось подготовить новый раунд',
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
  module: {
    labels: {
      wires: 'Провода',
      button: 'Кнопка',
      toggles: 'Тумблеры',
      symbols: 'Символы',
      lamps: 'Лампочки',
      disk: 'Диск'
    },
    status: {
      ready: 'готово',
      panel: 'панель',
      guide: 'инструкция'
    },
    guideLabel: 'ИНСТРУКЦИЯ',
    scanner: 'Сканер',
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
          coordinatorLines: [
            'Если синяя и текст HOLD, удерживай 2 секунды.',
            'Иначе удерживай 2 секунды.'
          ],
          actions: [{ action: 'hold-button', label: 'Удерживать кнопку 2 сек' }],
          solution: { action: 'hold-button' }
        },
        {
          label: 'Кнопка B',
          sapperLines: ['Большая красная кнопка.', 'Текст на кнопке: WAIT.'],
          coordinatorLines: [
            'Если красная и текст WAIT, удерживай 2 секунды.',
            'Иначе удерживай 2 секунды.'
          ],
          actions: [{ action: 'hold-button', label: 'Удерживать кнопку 2 сек' }],
          solution: { action: 'hold-button' }
        }
      ],
      toggles: [
        {
          label: 'Тумблеры A',
          sapperLines: ['Три тумблера.', 'Положение: верхний вверх, средний вниз, нижний вверх.'],
          coordinatorLines: [
            'Если крайние вверх — щелкни средний.',
            'Если крайние не вверх — сообщи позиции.'
          ],
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
          coordinatorLines: [
            'Если только нижний вверх — щелкни нижний.',
            'Если иначе — сообщи позиции.'
          ],
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
    },
    parsing: {
      symbolsOrderPrefix: 'Слева направо',
      lampsLitPrefix: 'Горят',
      diskHoursWord: 'часов',
      blueHint: 'син',
      redHint: 'крас',
    }
  },
  player: {
    you: ' • это вы',
    rolePending: 'Роль будет назначена на старте',
    online: 'online',
    offline: 'offline'
  }
} as const;







