<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Icon from './lib/Icon.svelte';
  import PriceChart from './lib/PriceChart.svelte';
  import LineChart from './lib/LineChart.svelte';
  import { request, exportFile, money, pct, date, time } from './lib/api';
  import type { State, RiskOptions, TrainingOptions } from './lib/types';
  import { saveTheme, type Theme } from './lib/theme';
  import { version } from '../package.json';
  let { initialTheme }: { initialTheme: Theme } = $props();
  let theme = $state(untrack(() => initialTheme));
  let savingTheme = $state(false);
  async function selectTheme(value: Theme) {
    savingTheme = true;
    try {
      await saveTheme(value);
      theme = value;
    } catch {
      notify('Не удалось сохранить тему. Попробуйте ещё раз.');
    } finally {
      savingTheme = false;
    }
  }
  type Page = 'overview' | 'training' | 'simulation' | 'journal' | 'data' | 'method';
  let page = $state<Page>('overview');
  let lab = $state<State | null>(null),
    error = $state(''),
    toast = $state(''),
    connected = $state(false),
    sending = $state(false);
  let timeframe = $state('15m'),
    days = $state(90),
    resetArmed = $state(false),
    filter = $state('all');
  let training = $state<TrainingOptions>({
    epochs: 120,
    learningRate: 0.03,
    horizon: 4,
    labelThreshold: 0.003,
  });
  let risk = $state<RiskOptions>({
    initialBalance: 10000,
    leverage: 3,
    riskPercent: 0.5,
    stopAtr: 2,
    rewardRisk: 2,
    confidence: 0.5,
    feeBps: 5.5,
    slippageBps: 2,
    maxDrawdownPercent: 15,
    maxHoldBars: 16,
    maintenancePercent: 0.5,
  });
  let busy = $derived(sending || lab?.job?.status === 'running');
  let latest = $derived(lab?.charts['15m'].at(-1));
  let change = $derived.by(() => {
    const c = lab?.charts['15m'];
    return c && c.length > 96 ? (c.at(-1)!.close / c[c.length - 97].close - 1) * 100 : 0;
  });
  let signal = $derived(
    lab?.prediction
      ? ['SHORT', 'ОЖИДАНИЕ', 'LONG'][lab.prediction.indexOf(Math.max(...lab.prediction))]
      : 'НЕ ОБУЧЕНА',
  );
  let confidence = $derived(lab?.prediction ? Math.max(...lab.prediction) * 100 : 0);
  const navigation: { id: Page; icon: string; label: string }[] = [
    { id: 'overview', icon: 'grid', label: 'Обзор рынка' },
    { id: 'training', icon: 'brain', label: 'Обучение ИИ' },
    { id: 'simulation', icon: 'chart', label: 'Симуляция' },
    { id: 'journal', icon: 'list', label: 'Журнал сделок' },
    { id: 'data', icon: 'database', label: 'Данные' },
  ];
  const titles: Record<Page, string> = {
    overview: 'Обзор рынка',
    training: 'Обучение ИИ',
    simulation: 'Симуляция стратегии',
    journal: 'Журнал сделок',
    data: 'История рынка',
    method: 'Как устроена лаборатория',
  };
  const riskFields: {
    key: keyof RiskOptions;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }[] = [
    {
      key: 'initialBalance',
      label: 'Стартовый капитал',
      min: 100,
      max: 10000000,
      step: 100,
      unit: 'USDT',
    },
    { key: 'leverage', label: 'Плечо', min: 1, max: 10, step: 1, unit: '×' },
    { key: 'riskPercent', label: 'Риск на сделку', min: 0.1, max: 2, step: 0.1, unit: '%' },
    { key: 'stopAtr', label: 'Стоп-лосс', min: 1, max: 5, step: 0.1, unit: 'ATR' },
    { key: 'rewardRisk', label: 'Прибыль / риск', min: 1, max: 5, step: 0.1, unit: ': 1' },
    {
      key: 'confidence',
      label: 'Порог вероятности',
      min: 0.34,
      max: 0.95,
      step: 0.01,
      unit: '0–1',
    },
    { key: 'feeBps', label: 'Комиссия за сторону', min: 0, max: 100, step: 0.1, unit: 'bps' },
    { key: 'slippageBps', label: 'Проскальзывание', min: 0, max: 100, step: 0.5, unit: 'bps' },
    { key: 'maxDrawdownPercent', label: 'Лимит просадки', min: 1, max: 50, step: 1, unit: '%' },
    { key: 'maxHoldBars', label: 'Максимум в позиции', min: 1, max: 96, step: 1, unit: 'свечей' },
    {
      key: 'maintenancePercent',
      label: 'Поддерживающая маржа',
      min: 0.1,
      max: 5,
      step: 0.1,
      unit: '%',
    },
  ];
  let initialized = false,
    previousJob = '',
    toastTimer: ReturnType<typeof setTimeout>;
  function notify(text: string) {
    toast = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 5500);
  }
  async function refresh() {
    try {
      const next = await request<State>('state');
      lab = next;
      connected = true;
      if (!initialized) {
        risk = { ...next.risk };
        if (next.model) training = { ...next.model.options };
        initialized = true;
      }
      const jobKey = next.job ? next.job.id + next.job.status : '';
      if (previousJob && jobKey !== previousJob && next.job?.status === 'completed')
        notify('Готово. Результат сохранён.');
      if (next.job?.status === 'failed' && jobKey !== previousJob)
        error = next.job.error || 'Операция не завершена';
      previousJob = jobKey;
    } catch (e) {
      connected = false;
      if (!lab) error = String(e);
    }
  }
  onMount(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh();
      if (alive) timer = setTimeout(poll, 900);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(toastTimer);
    };
  });
  async function run(action: string, payload?: unknown) {
    sending = true;
    error = '';
    try {
      await request(action, payload);
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      sending = false;
    }
  }
  async function save(kind: string) {
    try {
      if (await exportFile(kind)) notify('Файл экспортирован');
    } catch (e) {
      error = String(e);
    }
  }
  let visibleTrades = $derived(
    lab?.result?.trades.filter((t) => filter === 'all' || t.side === filter) || [],
  );
</script>

<svelte:head><title>Xkiller · {titles[page]}</title></svelte:head>
<div class="app-shell">
  <aside class="sidebar">
    <a
      href="#overview"
      class="brand"
      aria-label="Xkiller — обзор рынка"
      onclick={(e) => {
        e.preventDefault();
        page = 'overview';
      }}><span class="brand-mark">x</span><span>xkiller<span class="brand-period">.</span></span></a
    >
    <div class="workspace-label">RESEARCH WORKSPACE <span>01</span></div>
    <nav aria-label="Основная навигация">
      {#each navigation as item, index}<button
          class:active={page === item.id}
          aria-label={item.label}
          aria-current={page === item.id ? 'page' : undefined}
          onclick={() => (page = item.id)}
          ><span class="nav-number" aria-hidden="true">0{index + 1}</span><Icon
            name={item.icon}
          /><span>{item.label}</span></button
        >{/each}
    </nav>
    <div class="sidebar-bottom">
      <div class="mode-card">
        <span class="mode-icon"><Icon name="shield" size={18} /></span>
        <div>
          <strong>Режим исследования</strong>
          <p>Обучение и симуляция</p>
        </div>
        <span class="status-dot"></span>
      </div>
      <button
        class="help-link"
        aria-label="Как это работает"
        aria-current={page === 'method' ? 'page' : undefined}
        onclick={() => (page = 'method')}
        ><Icon name="info" size={17} /> Как это работает <span>↗</span></button
      >
      <div class="version"><span>DESKTOP LAB</span><span>v{version}</span></div>
    </div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <div class="breadcrumb">
        Рабочее пространство <span>/</span> <strong>{titles[page]}</strong>
      </div>
      <div class="topbar-right">
        <span class="connection"
          ><i class:offline={!connected}></i>{connected ? 'Движок подключён' : 'Подключение…'}</span
        ><span class="separator"></span><span class="market-label"
          >BYBIT <span>ETH / USDT</span></span
        >
        <div class="theme-switch" role="group" aria-label="Тема оформления">
          <button
            aria-label="Светлая тема"
            aria-pressed={theme === 'light'}
            disabled={savingTheme}
            onclick={() => selectTheme('light')}
            ><Icon name="sun" size={16} /><span>Светлая</span></button
          >
          <button
            aria-label="Тёмная тема"
            aria-pressed={theme === 'dark'}
            disabled={savingTheme}
            onclick={() => selectTheme('dark')}
            ><Icon name="moon" size={16} /><span>Тёмная</span></button
          >
        </div>
      </div>
    </header>
    <main>
      {#if error}<div class="alert error" role="alert">
          <Icon name="info" /><span>{error}</span><button
            class="icon-button"
            aria-label="Закрыть ошибку"
            onclick={() => (error = '')}><Icon name="close" size={16} /></button
          >
        </div>{/if}
      {#if !connected && lab}<div class="alert error">
          Связь с движком потеряна. Показаны последние полученные данные.
        </div>{/if}
      {#if !lab}<div class="loading">
          <span class="loader"></span>
          <h2>Запускаем лабораторию</h2>
          <p>C# engine · локальная рабочая область</p>
          <button class="secondary" onclick={refresh}>Повторить подключение</button>
        </div>
      {:else}
        <section class="page-heading">
          <div>
            <div class="eyebrow">
              ETHEREUM RESEARCH LAB <span class="tiny-line"></span>
              {page === 'overview' ? 'MULTI-TIMEFRAME' : 'BYBIT PERPETUALS'}
            </div>
            <h1>{titles[page]}<span class="title-dot">.</span></h1>
            <p>
              {page === 'overview'
                ? 'От рыночных данных — к проверяемой стратегии.'
                : page === 'training'
                  ? 'Обучайте модель. Сравнивайте с базовой стратегией.'
                  : page === 'simulation'
                    ? 'Проверьте решения модели на отложенном участке истории.'
                    : page === 'journal'
                      ? 'Каждое решение, исполнение и результат — в одном месте.'
                      : page === 'data'
                        ? 'Закрытые свечи и история funding из публичного API Bybit.'
                        : 'Прозрачные допущения, воспроизводимые результаты.'}
            </p>
          </div>
          <div class="heading-actions">
            <span class="badge neutral"><i></i> PAPER ONLY</span>{#if page === 'overview'}<button
                class="primary"
                disabled={busy || !connected}
                onclick={() => {
                  page = 'training';
                }}
                ><Icon name="brain" size={17} /> Обучить модель <Icon
                  name="arrow"
                  size={16}
                /></button
              >{:else if page === 'journal'}<button
                class="secondary"
                disabled={!lab.result}
                onclick={() => save('trades')}
                ><Icon name="download" size={17} /> Экспорт CSV</button
              >{:else if page === 'simulation' && lab.result}<button
                class="secondary"
                onclick={() => save('report')}><Icon name="download" size={17} /> Отчёт JSON</button
              >{/if}
          </div>
        </section>
        <div class="data-ribbon" class:synthetic={lab.data.synthetic}>
          <div>
            <Icon name={lab.data.synthetic ? 'info' : 'database'} size={16} /><strong
              >{lab.data.synthetic ? 'Демонстрационный набор' : 'История Bybit'}</strong
            ><span
              >{lab.data.synthetic
                ? 'Синтетические цены · результаты не характеризуют рынок'
                : `${date(lab.data.start)} — ${date(lab.data.end)} · исторические данные`}</span
            >
          </div>
          <button onclick={() => (page = 'data')}
            >{lab.data.synthetic ? 'Загрузить Bybit' : 'Управление данными'}
            <Icon name="arrow" size={14} /></button
          >
        </div>
        {#if lab.job?.status === 'running'}<div class="job-bar" role="status">
            <span class="loader small"></span>
            <div>
              <strong
                >{lab.job.kind === 'train'
                  ? 'Обучение модели'
                  : lab.job.kind === 'import'
                    ? 'Загрузка истории'
                    : 'Расчёт'}</strong
              ><span>{lab.job.message}</span>
            </div>
            <progress max="100" value={lab.job.progress}></progress><b>{lab.job.progress}%</b
            ><button class="text-button" onclick={() => run('cancel')}>Отменить</button>
          </div>{/if}

        {#if page === 'overview'}
          <section class="stats-grid">
            <article class="stat">
              <div class="stat-label">ETH / USDT <span class="eth-symbol">◆</span></div>
              <div class="stat-value">${money(latest?.close || 0)}</div>
              <div class="stat-footer">
                <span class:positive={change >= 0} class:negative={change < 0}>{pct(change)}</span
                ><span>за последние 24ч набора</span>
              </div>
            </article>
            <article class="stat">
              <div class="stat-label">Решение модели <Icon name="brain" size={17} /></div>
              <div class="stat-value signal-value">{signal}</div>
              <div class="stat-footer">
                {#if lab.model}<span class="accent-text">{confidence.toFixed(1)}%</span><span
                    >оценка вероятности</span
                  >{:else}<span class="muted">Ожидает первого обучения</span>{/if}
              </div>
            </article>
            <article class="stat">
              <div class="stat-label">Капитал симуляции <Icon name="chart" size={17} /></div>
              <div class="stat-value">
                {lab.result ? '$' + money(lab.result.finalBalance) : '—'}
              </div>
              <div class="stat-footer">
                {#if lab.result}<span
                    class:positive={lab.result.returnPercent >= 0}
                    class:negative={lab.result.returnPercent < 0}
                    >{pct(lab.result.returnPercent)}</span
                  ><span>после расходов</span>{:else}<span class="muted"
                    >Запустите проверку стратегии</span
                  >{/if}
              </div>
            </article>
            <article class="stat">
              <div class="stat-label">Данные для обучения <Icon name="database" size={17} /></div>
              <div class="stat-value">
                {lab.data.count.toLocaleString('en-US')}<small>свечей</small>
              </div>
              <div class="stat-footer">
                <span class="mini-tag">15m</span><span class="mini-tag">1h</span><span
                  class="mini-tag">4h</span
                ><span class="muted">3 таймфрейма</span>
              </div>
            </article>
          </section>
          <div class="market-grid">
            <section class="panel chart-panel">
              <div class="panel-heading">
                <div class="instrument">
                  <span class="coin">◆</span>
                  <div>
                    <h2>Ethereum <span>ETHUSDT</span></h2>
                    <p>Perpetual futures <span>·</span> Bybit</p>
                  </div>
                </div>
                <div class="segmented" aria-label="Таймфрейм">
                  {#each ['15m', '1h', '4h'] as tf}<button
                      class:selected={timeframe === tf}
                      aria-pressed={timeframe === tf}
                      onclick={() => (timeframe = tf)}>{tf}</button
                    >{/each}
                </div>
              </div>
              <PriceChart candles={lab.charts[timeframe]} />
              <div class="chart-footer">
                <span><i class="legend-dot green"></i> Закрытые свечи</span><span
                  >{time(lab.data.end)} UTC <span class="muted">· конец набора</span></span
                >
              </div>
            </section>
            <section class="panel intelligence">
              <div class="panel-heading">
                <h2><Icon name="bolt" size={18} /> AI Insight</h2>
                <span class="badge accent">24 FEATURES</span>
              </div>
              <div class="intelligence-visual" aria-hidden="true">
                <strong>24<span>INPUTS</span></strong>
                <div><span>15 MIN</span><span>01 HOUR</span><span>04 HOURS</span></div>
              </div>
              <h3>{lab.model ? 'Модель готова к проверке' : 'Рынок — это данные.'}</h3>
              <p>
                {lab.model
                  ? `Модель ${lab.model.id} обучена на ранней части истории. Проверьте её решения в симуляции.`
                  : 'Объедините сигналы трёх таймфреймов и обучите свою первую модель.'}
              </p>
              <div class="insight-rows">
                <div><span>Алгоритм</span><strong>Softmax regression</strong></div>
                <div><span>Признаки</span><strong>8 × 3 таймфрейма</strong></div>
                <div>
                  <span>Статус</span><strong class="accent-text"
                    >{lab.model ? 'Обучена' : 'Готов к обучению'}</strong
                  >
                </div>
              </div>
              <button
                class="wide secondary"
                onclick={() => (page = lab?.model ? 'simulation' : 'training')}
                >{lab.model ? 'Перейти к симуляции' : 'Настроить обучение'}<Icon
                  name="arrow"
                  size={16}
                /></button
              >
            </section>
          </div>
          <div class="section-label">
            <h2>Согласованность таймфреймов</h2>
            <span>Индикаторы на последней закрытой свече</span>
          </div>
          <section class="frames-grid">
            {#each lab.frames as frame}<article class="panel frame-card">
                <div class="frame-heading">
                  <span class="frame-name">{frame.frame}</span><span
                    class:positive={frame.trend === 'Bullish'}
                    class:negative={frame.trend !== 'Bullish'}
                    class="trend-label"
                    >{frame.trend === 'Bullish' ? '↗ Восходящий' : '↘ Нисходящий'}</span
                  >
                </div>
                <div class="indicator">
                  <span>RSI <small>14</small></span><strong>{frame.rsi.toFixed(1)}</strong>
                  <div class="rsi-track"><i style:width={`${frame.rsi}%`}></i></div>
                </div>
                <div class="frame-bottom">
                  <div>
                    <span>MACD histogram</span><b
                      class:positive={frame.macd >= 0}
                      class:negative={frame.macd < 0}>{frame.macd.toFixed(2)}</b
                    >
                  </div>
                  <div><span>ATR <small>14</small></span><b>${frame.atr.toFixed(2)}</b></div>
                  <div>
                    <span>EMA 12 / 26</span><b
                      >{frame.ema12 > frame.ema26 ? 'Bullish' : 'Bearish'}</b
                    >
                  </div>
                </div>
              </article>{/each}
          </section>
          <div class="workflow-strip">
            <span class="step-number">01</span>
            <div>
              <strong>Данные</strong><span
                >{lab.data.synthetic ? 'Демо-набор' : 'История загружена'}</span
              >
            </div>
            <Icon name="arrow" size={17} /><span class="step-number">02</span>
            <div>
              <strong>Обучение</strong><span
                >{lab.model ? 'Модель сохранена' : '24 признака · 3 класса'}</span
              >
            </div>
            <Icon name="arrow" size={17} /><span class="step-number">03</span>
            <div><strong>Симуляция</strong><span>Плечо · расходы · риск</span></div>
            <button class="text-button" onclick={() => (page = 'method')}
              >Методология <Icon name="arrow" size={16} /></button
            >
          </div>
        {:else if page === 'training'}
          <div class="two-columns">
            <section class="panel">
              <div class="panel-heading">
                <h2>Параметры обучения</h2>
                <span class="badge accent">SUPERVISED ML</span>
              </div>
              <form
                class="panel-body"
                onsubmit={(e) => {
                  e.preventDefault();
                  void run('train', training);
                }}
              >
                <p class="form-description">
                  Модель учится классифицировать будущее движение цены: short, ожидание или long.
                </p>
                <div class="form-grid">
                  <label
                    >Количество эпох<input
                      type="number"
                      min="10"
                      max="500"
                      step="5"
                      bind:value={training.epochs}
                      required
                    /><small>Число проходов по обучающей выборке</small></label
                  ><label
                    >Скорость обучения<input
                      type="number"
                      min="0.001"
                      max="0.2"
                      step="0.001"
                      bind:value={training.learningRate}
                      required
                    /><small>Шаг обновления весов</small></label
                  ><label
                    >Горизонт прогноза<select bind:value={training.horizon}
                      ><option value={1}>15 минут · 1 свеча</option><option value={4}
                        >1 час · 4 свечи</option
                      ><option value={8}>2 часа · 8 свечей</option><option value={16}
                        >4 часа · 16 свечей</option
                      ></select
                    ><small>От открытия следующей свечи</small></label
                  ><label
                    >Порог движения<select bind:value={training.labelThreshold}
                      ><option value={0.001}>±0.1%</option><option value={0.003}>±0.3%</option
                      ><option value={0.005}>±0.5%</option><option value={0.01}>±1.0%</option
                      ></select
                    ><small>Меньшее движение → ожидание</small></label
                  >
                </div>
                <div class="split-visual">
                  <span>60% обучение</span><span>20% валидация</span><span>20% тест</span>
                </div>
                <p class="note">
                  Хронологическое разделение с пропуском свечей между выборками. Лучшая эпоха
                  выбирается по ошибке валидации. Повторное обучение заменит текущую модель и её
                  симуляции.
                </p>
                <button class="primary wide" type="submit" disabled={busy || !connected}
                  ><Icon name="play" size={17} />{busy
                    ? 'Выполняется операция…'
                    : 'Обучить модель'}</button
                >
              </form>
            </section>
            <section class="panel">
              <div class="panel-heading">
                <h2>Качество модели</h2>
                {#if lab.model}<button
                    class="icon-button"
                    title="Экспорт модели"
                    aria-label="Экспорт модели"
                    onclick={() => save('model')}><Icon name="download" size={18} /></button
                  >{/if}
              </div>
              {#if lab.model}<div class="panel-body">
                  <div class="model-meta">
                    <span class="badge green">ОБУЧЕНА</span><span
                      >#{lab.model.id} · эпоха {lab.model.bestEpoch}</span
                    >
                  </div>
                  <div class="metrics-inline">
                    <div>
                      <span>Точность на тесте</span><strong
                        >{(lab.model.test.accuracy * 100).toFixed(1)}%</strong
                      >
                    </div>
                    <div>
                      <span>Базовая точность</span><strong
                        >{(lab.model.test.baselineAccuracy * 100).toFixed(1)}%</strong
                      >
                    </div>
                    <div>
                      <span>Log loss</span><strong>{lab.model.test.logLoss.toFixed(3)}</strong>
                    </div>
                  </div>
                  <LineChart
                    values={lab.model.loss.map((l) => l.train)}
                    secondary={lab.model.loss.map((l) => l.validation)}
                    label="Ошибка обучения и валидации по эпохам"
                  />
                  <div class="chart-legend">
                    <span><i class="legend-dot accent"></i> Обучение</span><span
                      ><i class="legend-dot green"></i> Валидация</span
                    >
                  </div>
                  <p class="note">
                    База всегда выбирает самый частый класс обучающей выборки. Тест: {lab.model.test.samples.toLocaleString()}
                    примеров. Точность не измеряет доходность.
                  </p>
                </div>{:else}<div class="empty-state">
                  <span class="empty-icon"><Icon name="brain" size={34} /></span>
                  <h3>Начните первый эксперимент</h3>
                  <p>
                    После обучения здесь появятся ошибка по эпохам и качество на отложенных данных.
                  </p>
                </div>{/if}
            </section>
          </div>
          {#if lab.model}<section class="panel feature-panel">
              <div class="panel-heading">
                <h2>Влияние признаков на класс Long</h2>
                <span>Коэффициенты стандартизированных признаков</span>
              </div>
              <div class="feature-grid">
                {#each lab.features
                  .map((name, i) => ({ name, value: lab!.model!.weights[2][i] }))
                  .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                  .slice(0, 9) as feature}<div class="feature-row">
                    <span>{feature.name}</span>
                    <div>
                      <i style:width={`${Math.min(100, Math.abs(feature.value) * 180)}%`}></i>
                    </div>
                    <b>{feature.value.toFixed(3)}</b>
                  </div>{/each}
              </div>
              <p class="note">Коэффициенты описывают модель, а не причинное влияние на рынок.</p>
            </section>{/if}
        {:else if page === 'simulation'}
          <div class="simulation-grid">
            <section class="panel">
              <div class="panel-heading">
                <h2><Icon name="settings" size={18} /> Исполнение и риск</h2>
              </div>
              <form
                class="panel-body"
                onsubmit={(e) => {
                  e.preventDefault();
                  void run('simulate', risk);
                }}
              >
                <div class="form-grid risk-grid">
                  {#each riskFields as field}<label
                      >{field.label}
                      <div class="input-unit">
                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          bind:value={risk[field.key]}
                          required
                        /><span>{field.unit}</span>
                      </div></label
                    >{/each}
                </div>
                <p class="note">
                  1 bps = 0.01%. Комиссия и маржа — настраиваемые допущения. Funding загружен вместе
                  с историей. Вход на открытии следующей свечи.
                </p>
                <button
                  class="primary wide"
                  type="submit"
                  disabled={busy || !connected || !lab.model}
                  ><Icon name="play" size={17} /> Запустить симуляцию</button
                >{#if !lab.model}<button
                    type="button"
                    class="text-button centered"
                    onclick={() => (page = 'training')}>Сначала обучите модель →</button
                  >{/if}
              </form>
            </section>
            <div class="simulation-results">
              {#if lab.result}{@const result = lab.result}
                <section class="stats-grid compact">
                  <article class="stat">
                    <div class="stat-label">Доходность</div>
                    <div
                      class="stat-value"
                      class:positive={result.returnPercent >= 0}
                      class:negative={result.returnPercent < 0}
                    >
                      {pct(result.returnPercent)}
                    </div>
                    <div class="stat-footer">После всех расходов</div>
                  </article>
                  <article class="stat">
                    <div class="stat-label">Макс. просадка</div>
                    <div class="stat-value">{result.maxDrawdownPercent.toFixed(2)}%</div>
                    <div class="stat-footer">По капиталу на закрытии свечей</div>
                  </article>
                  <article class="stat">
                    <div class="stat-label">Сделок / Win rate</div>
                    <div class="stat-value">
                      {result.count}<small>{(result.winRate * 100).toFixed(1)}%</small>
                    </div>
                    <div class="stat-footer">
                      Profit factor: {result.profitFactor?.toFixed(2) || '—'}
                    </div>
                  </article>
                </section>
                <section class="panel">
                  <div class="panel-heading">
                    <h2>Кривая капитала</h2>
                    <span class="badge" class:amber={result.halted} class:green={!result.halted}
                      >{result.halted ? 'ОСТАНОВКА ПО РИСКУ' : 'ЗАВЕРШЕНО'}</span
                    >
                  </div>
                  <div class="panel-body">
                    <div class="equity-value">${money(result.finalBalance)}<span>USDT</span></div>
                    <LineChart
                      values={result.equity.map((p) => p.equity)}
                      color={result.returnPercent >= 0 ? 'var(--positive)' : 'var(--negative)'}
                    />
                    <div class="range-label">
                      <span>{date(result.equity[0].time)}</span><span
                        >{date(result.equity.at(-1)!.time)}</span
                      >
                    </div>
                    <div class="costs">
                      <div><span>Комиссии</span><strong>${money(result.totalFees)}</strong></div>
                      <div>
                        <span>Funding (оплачено)</span><strong>${money(result.totalFunding)}</strong
                        >
                      </div>
                      <div>
                        <span>Плечо в запуске</span><strong>{result.options.leverage}×</strong>
                      </div>
                    </div>
                    <button class="secondary wide" onclick={() => (page = 'journal')}
                      >Открыть журнал сделок <Icon name="arrow" size={17} /></button
                    >
                  </div>
                </section>{:else}<section class="panel fill-height">
                  <div class="empty-state">
                    <span class="empty-icon"><Icon name="chart" size={38} /></span>
                    <h3>Проверьте гипотезу</h3>
                    <p>
                      Симуляция использует последние 20% истории, не участвовавшие в обучении.
                      Результат появится после запуска.
                    </p>
                    <div class="badge neutral">HISTORICAL PAPER TRADING</div>
                  </div>
                </section>{/if}
            </div>
          </div>
          {#if lab.runs.length}<section class="panel runs-panel">
              <div class="panel-heading">
                <h2>История экспериментов</h2>
                <span>Последние 20 запусков текущей модели</span>
              </div>
              <div class="table-wrap">
                <table>
                  <thead
                    ><tr
                      ><th>Запуск</th><th>Модель</th><th>Доходность</th><th>Просадка</th><th
                        >Сделки</th
                      ><th>Капитал</th></tr
                    ></thead
                  ><tbody
                    >{#each lab.runs as run}<tr
                        ><td>#{run.id}</td><td class="muted">{run.modelId}</td><td
                          class:positive={run.returnPercent >= 0}
                          class:negative={run.returnPercent < 0}>{pct(run.returnPercent)}</td
                        ><td>{run.maxDrawdownPercent.toFixed(2)}%</td><td>{run.count}</td><td
                          >${money(run.finalBalance)}</td
                        ></tr
                      >{/each}</tbody
                  >
                </table>
              </div>
            </section>{/if}
        {:else if page === 'journal'}
          <section class="panel">
            <div class="panel-heading">
              <h2>Исполненные сделки <span class="count">{lab.result?.count || 0}</span></h2>
              <div class="segmented">
                {#each [{ id: 'all', text: 'Все' }, { id: 'Long', text: 'Long' }, { id: 'Short', text: 'Short' }] as f}<button
                    class:selected={filter === f.id}
                    aria-pressed={filter === f.id}
                    onclick={() => (filter = f.id)}>{f.text}</button
                  >{/each}
              </div>
            </div>
            {#if visibleTrades.length}<div class="table-wrap">
                <table>
                  <thead
                    ><tr
                      ><th>Вход · UTC</th><th>Сторона</th><th>Цена входа</th><th>Цена выхода</th><th
                        >Объём ETH</th
                      ><th>Результат</th><th>Комиссия</th><th>Funding</th><th>Причина выхода</th
                      ></tr
                    ></thead
                  ><tbody
                    >{#each visibleTrades as trade}<tr
                        ><td class="muted">{time(trade.entryTime)}</td><td
                          ><span
                            class="trade-side"
                            class:positive={trade.side === 'Long'}
                            class:negative={trade.side === 'Short'}>{trade.side}</span
                          ></td
                        ><td>{money(trade.entry)}</td><td>{money(trade.exit)}</td><td
                          >{trade.quantity.toFixed(4)}</td
                        ><td class:positive={trade.pnl >= 0} class:negative={trade.pnl < 0}
                          >{trade.pnl > 0 ? '+' : ''}{money(trade.pnl)}</td
                        ><td>{money(trade.fees)}</td><td>{money(trade.funding)}</td><td
                          ><span class="reason">{trade.reason}</span></td
                        ></tr
                      >{/each}</tbody
                  >
                </table>
              </div>
              <p class="note table-note">
                Последние 100 сделок последнего запуска. CSV содержит полный журнал. Все суммы —
                USDT, результат включает расходы.
              </p>{:else}<div class="empty-state">
                <span class="empty-icon"><Icon name="list" size={36} /></span>
                <h3>{lab.result ? 'Нет сделок по этому фильтру' : 'Журнал пока пуст'}</h3>
                <p>
                  {lab.result
                    ? 'Модель может оставаться вне рынка при высоком пороге вероятности.'
                    : 'Запустите симуляцию, чтобы увидеть решения и результаты модели.'}
                </p>
                <button class="secondary" onclick={() => (page = 'simulation')}
                  >К симуляции <Icon name="arrow" size={16} /></button
                >
              </div>{/if}
          </section>
        {:else if page === 'data'}
          <div class="two-columns">
            <section class="panel">
              <div class="panel-heading">
                <h2>Загрузить историю</h2>
                <span class="bybit-word">BYBIT</span>
              </div>
              <form
                class="panel-body"
                onsubmit={(e) => {
                  e.preventDefault();
                  void run('import', { days });
                }}
              >
                <div class="data-pair">
                  <span class="coin large">◆</span>
                  <div>
                    <h3>ETH / USDT</h3>
                    <p>USDT perpetual · linear · 15 минут</p>
                  </div>
                  <span class="badge neutral">PUBLIC API</span>
                </div>
                <label
                  >Глубина истории<select bind:value={days}
                    ><option value={30}>30 дней · 2 880 свечей</option><option value={90}
                      >90 дней · 8 640 свечей</option
                    ><option value={180}>180 дней · 17 280 свечей</option><option value={360}
                      >360 дней · 34 560 свечей</option
                    ></select
                  ></label
                >
                <div class="check-list">
                  <p><Icon name="check" size={16} /> Только полностью закрытые свечи</p>
                  <p><Icon name="check" size={16} /> Автоматическое построение 1h и 4h</p>
                  <p><Icon name="check" size={16} /> Исторические платежи funding</p>
                  <p><Icon name="check" size={16} /> Проверка пропусков и целостности</p>
                </div>
                <p class="note">
                  Новый набор заменит текущую модель и симуляции. При ошибке загрузки текущая
                  рабочая область сохранится. API-ключ не требуется.
                </p>
                <button class="primary wide" type="submit" disabled={busy || !connected}
                  ><Icon name="download" size={17} /> Загрузить данные Bybit</button
                >
              </form>
            </section>
            <section class="panel">
              <div class="panel-heading">
                <h2>Текущий набор</h2>
                <span
                  class="badge"
                  class:amber={lab.data.synthetic}
                  class:green={!lab.data.synthetic}
                  >{lab.data.synthetic ? 'SYNTHETIC' : 'BYBIT'}</span
                >
              </div>
              <div class="panel-body">
                <dl class="dataset-details">
                  <div>
                    <dt>Источник</dt>
                    <dd>{lab.data.source}</dd>
                  </div>
                  <div>
                    <dt>Период UTC</dt>
                    <dd>{date(lab.data.start)} — {date(lab.data.end)}</dd>
                  </div>
                  <div>
                    <dt>Свечей 15m</dt>
                    <dd>{lab.data.count.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Funding событий</dt>
                    <dd>{lab.data.fundingCount}</dd>
                  </div>
                  <div>
                    <dt>Идентификатор</dt>
                    <dd class="mono">{lab.data.id}</dd>
                  </div>
                  <div>
                    <dt>Загружено</dt>
                    <dd>{date(lab.data.importedAt)}</dd>
                  </div>
                </dl>
                <div class="demo-box">
                  <h3>Демо без подключения</h3>
                  <p>
                    Воспроизводимый синтетический набор для проверки функций приложения. Не подходит
                    для оценки торговой стратегии.
                  </p>
                  <button
                    class="secondary wide"
                    disabled={busy}
                    onclick={() => {
                      if (resetArmed) {
                        void run('demo');
                        resetArmed = false;
                      } else resetArmed = true;
                    }}
                    >{resetArmed
                      ? 'Подтвердить замену данных и модели'
                      : 'Использовать демо-набор'}</button
                  >{#if resetArmed}<button
                      class="text-button centered"
                      onclick={() => (resetArmed = false)}>Отмена</button
                    >{/if}
                </div>
              </div>
            </section>
          </div>
        {:else}
          <div class="method-grid">
            {#each [{ n: '01', title: 'Из истории — в признаки', text: 'Закрытые свечи Bybit ETHUSDT объединяются в 15m, 1h и 4h. На каждом таймфрейме рассчитываются EMA, RSI, MACD, ATR, полосы Боллинджера, объём и импульс. Старшая свеча доступна только после её закрытия.' }, { n: '02', title: 'Модель действительно обучается', text: 'Многоклассовая логистическая регрессия обновляет веса градиентным спуском. Три класса: short, ожидание, long. Среднее и масштаб признаков вычисляются только на обучающей выборке. Вероятности не калиброваны.' }, { n: '03', title: 'Будущее отделено от прошлого', text: '60% истории используются для обучения, 20% для выбора эпохи, 20% для теста. Между выборками исключается горизонт прогноза. Симуляция начинается после первого тестового сигнала, на открытии следующей свечи.' }, { n: '04', title: 'Расходы и исполнение', text: 'Учитываются комиссия входа и выхода, направленное проскальзывание и исторический funding. Позиция ограничена риском до стопа и доступной маржой. Если свеча задевает стоп и тейк, первым считается стоп.' }, { n: '05', title: 'Границы симуляции', text: 'Исполнение моделируется по OHLC, без стакана и частичных исполнений. Funding оценивается по цене открытия свечи. Ликвидация приближённая: нет mark price, ступенчатой маржи, ADL и ликвидационной комиссии. Просадка контролируется на закрытии свечи; гэп может превысить лимит.' }, { n: '06', title: 'Как читать результат', text: 'Бэктест не гарантирует будущей прибыли. Многократная настройка параметров по одному тесту ведёт к переобучению: для нового вывода нужен новый период. Приложение исследовательское: реальных ордеров, ключей биржи и фоновой торговли нет.' }] as item}<section
                class="panel method-card"
              >
                <span class="method-number">{item.n}</span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </section>{/each}
          </div>
        {/if}
        <footer class="page-footer">
          <span
            ><Icon name="shield" size={14} /> Локальная лаборатория. Реальные ордера не отправляются.</span
          ><span>ETHUSDT PERPETUAL <span>·</span> XKILLER LAB</span>
        </footer>
      {/if}
    </main>
  </div>
</div>
{#if toast}<div class="toast" role="status"><Icon name="check" size={18} />{toast}</div>{/if}
