<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './lib/Icon.svelte';
  import PriceChart from './lib/PriceChart.svelte';
  import LineChart from './lib/LineChart.svelte';
  import { request, exportFile } from './lib/api';
  import { money, pct, date, time, number, integer } from './lib/format.svelte';
  import { t, featureLabel } from './lib/i18n.svelte';
  import AppearanceControls from './lib/AppearanceControls.svelte';
  import type { State, RiskOptions, TrainingOptions } from './lib/types';
  import { version } from '../package.json';
  import Tabs from './lib/Tabs.svelte';
  import Pager from './lib/Pager.svelte';
  import { paginate } from './lib/pagination';
  import { jobKey, completedJob } from './lib/jobs';
  type Page = 'overview' | 'training' | 'simulation' | 'journal' | 'data' | 'method';
  let page = $state<Page>('overview');
  let sections = $state<Record<Page, string>>({
    overview: 'market',
    training: 'setup',
    simulation: 'setup',
    journal: 'execution',
    data: 'import',
    method: 'research',
  });
  let contentHeight = $state(400),
    tradePage = $state(0),
    runPage = $state(0);
  let rowsPerPage = $derived(Math.max(1, Math.min(16, Math.floor((contentHeight - 158) / 34))));
  let views = $derived({
    overview: [
      { id: 'market', label: t('View market') },
      { id: 'frames', label: t('View frames') },
    ],
    training: [
      { id: 'setup', label: t('View setup') },
      { id: 'quality', label: t('View quality') },
      { id: 'features', label: t('View features') },
    ],
    simulation: [
      { id: 'setup', label: t('View setup') },
      { id: 'result', label: t('View result') },
      { id: 'history', label: t('View history') },
    ],
    journal: [
      { id: 'execution', label: t('View execution') },
      { id: 'costs', label: t('View costs') },
    ],
    data: [
      { id: 'import', label: t('View import') },
      { id: 'dataset', label: t('View dataset') },
      { id: 'demo', label: t('View demo') },
    ],
    method: [
      { id: 'research', label: t('View research') },
      { id: 'assumptions', label: t('View assumptions') },
    ],
  });
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
      ? [t('Short'), t('ОЖИДАНИЕ'), t('Long')][lab.prediction.indexOf(Math.max(...lab.prediction))]
      : t('НЕ ОБУЧЕНА'),
  );
  let confidence = $derived(lab?.prediction ? Math.max(...lab.prediction) * 100 : 0);
  let navigation: { id: Page; icon: string; label: string }[] = $derived([
    { id: 'overview', icon: 'grid', label: t('Обзор рынка') },
    { id: 'training', icon: 'brain', label: t('Обучение ИИ') },
    { id: 'simulation', icon: 'chart', label: t('Симуляция') },
    { id: 'journal', icon: 'list', label: t('Журнал сделок') },
    { id: 'data', icon: 'database', label: t('Данные') },
  ]);
  let titles: Record<Page, string> = $derived({
    overview: t('Обзор рынка'),
    training: t('Обучение ИИ'),
    simulation: t('Симуляция стратегии'),
    journal: t('Журнал сделок'),
    data: t('История рынка'),
    method: t('Как устроена лаборатория'),
  });
  let riskFields: {
    key: keyof RiskOptions;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }[] = $derived([
    {
      key: 'initialBalance',
      label: t('Стартовый капитал'),
      min: 100,
      max: 10000000,
      step: 100,
      unit: 'USDT',
    },
    { key: 'leverage', label: t('Плечо'), min: 1, max: 10, step: 1, unit: '×' },
    { key: 'riskPercent', label: t('Риск на сделку'), min: 0.1, max: 2, step: 0.1, unit: '%' },
    { key: 'stopAtr', label: t('Стоп-лосс'), min: 1, max: 5, step: 0.1, unit: 'ATR' },
    { key: 'rewardRisk', label: t('Прибыль / риск'), min: 1, max: 5, step: 0.1, unit: ': 1' },
    {
      key: 'confidence',
      label: t('Порог вероятности'),
      min: 0.34,
      max: 0.95,
      step: 0.01,
      unit: '0–1',
    },
    { key: 'feeBps', label: t('Комиссия за сторону'), min: 0, max: 100, step: 0.1, unit: 'bps' },
    { key: 'slippageBps', label: t('Проскальзывание'), min: 0, max: 100, step: 0.5, unit: 'bps' },
    { key: 'maxDrawdownPercent', label: t('Лимит просадки'), min: 1, max: 50, step: 1, unit: '%' },
    {
      key: 'maxHoldBars',
      label: t('Максимум в позиции'),
      min: 1,
      max: 96,
      step: 1,
      unit: t('свечей'),
    },
    {
      key: 'maintenancePercent',
      label: t('Поддерживающая маржа'),
      min: 0.1,
      max: 5,
      step: 0.1,
      unit: '%',
    },
  ]);
  let initialized = false,
    previousJob = '',
    submittedKind = '',
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
      const nextJobKey = jobKey(next.job);
      if (next.job && completedJob(previousJob, next.job, submittedKind)) {
        if (next.job.kind === 'train') sections.training = 'quality';
        if (next.job.kind === 'simulate') sections.simulation = 'result';
        if (next.job.kind === 'import') sections.data = 'dataset';
        notify(t('Готово. Результат сохранён.'));
      }
      if (next.job?.status === 'failed' && nextJobKey !== previousJob)
        error = next.job.error || t('Операция не завершена');
      previousJob = nextJobKey;
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
    submittedKind = action;
    error = '';
    try {
      await request(action, payload);
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      sending = false;
      submittedKind = '';
    }
  }
  async function save(kind: string) {
    try {
      if (await exportFile(kind)) notify(t('Файл экспортирован'));
    } catch (e) {
      error = String(e);
    }
  }
  let visibleTrades = $derived(
    lab?.result?.trades.filter((t) => filter === 'all' || t.side === filter) || [],
  );
  let tradeWindow = $derived(paginate(visibleTrades, tradePage, rowsPerPage));
  let runWindow = $derived(paginate(lab?.runs || [], runPage, rowsPerPage));
  let resultIdentity = $derived(lab?.result?.id);
  $effect(() => {
    filter;
    resultIdentity;
    tradePage = 0;
  });
</script>

<svelte:head><title>{t('Xkiller ·')} {titles[page]}</title></svelte:head>
<div class="app-shell">
  <aside class="sidebar">
    <a
      href="#overview"
      class="brand"
      aria-label={t('Xkiller — обзор рынка')}
      onclick={(e) => {
        e.preventDefault();
        page = 'overview';
      }}
      ><img class="brand-mark" src="./icon.png" alt="" width="42" height="42" /><span
        >{t('xkiller')}<span class="brand-period">.</span></span
      ></a
    >
    <div class="workspace-label">{t('RESEARCH WORKSPACE')} <span>01</span></div>
    <nav aria-label={t('Основная навигация')}>
      {#each navigation as item, index}<button
          class:active={page === item.id}
          aria-label={item.label}
          title={item.label}
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
          <strong>{t('Режим исследования')}</strong>
          <p>{t('Обучение и симуляция')}</p>
        </div>
        <span class="status-dot"></span>
      </div>
      <button
        class="help-link"
        aria-label={t('Как это работает')}
        aria-current={page === 'method' ? 'page' : undefined}
        onclick={() => (page = 'method')}
        ><Icon name="info" size={17} />
        {t('Как это работает')} <span><Icon name="arrow" size={13} rotate={-45} /></span></button
      >
      <div class="version"><span>{t('DESKTOP LAB')}</span><span>v{version}</span></div>
    </div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <div class="breadcrumb">
        {t('Рабочее пространство')} <span>/</span> <strong>{titles[page]}</strong>
      </div>
      <div class="topbar-right">
        <span class="connection"
          ><i class:offline={!connected}></i>{connected
            ? t('Движок подключён')
            : t('Подключение…')}</span
        ><span class="separator"></span><span class="market-label"
          >{t('BYBIT')} <span>{t('ETH / USDT')}</span></span
        >
        <AppearanceControls onerror={notify} />
      </div>
    </header>
    <main>
      {#if error}<div class="alert error" role="alert">
          <Icon name="info" /><span>{t(error)}</span><button
            class="icon-button"
            aria-label={t('Закрыть ошибку')}
            onclick={() => (error = '')}><Icon name="close" size={16} /></button
          >
        </div>{/if}
      {#if !connected && lab}<div class="alert error">
          {t('Связь с движком потеряна. Показаны последние полученные данные.')}
        </div>{/if}
      {#if !lab}<div class="loading">
          <span class="loader"></span>
          <h2>{t('Запускаем лабораторию')}</h2>
          <p>{t('C# engine · локальная рабочая область')}</p>
          <button class="secondary" onclick={refresh}>{t('Повторить подключение')}</button>
        </div>
      {:else}
        <section class="page-heading">
          <div>
            <div class="eyebrow">
              {t('ETHEREUM RESEARCH LAB')} <span class="tiny-line"></span>
              {page === 'overview' ? t('MULTI-TIMEFRAME') : t('BYBIT PERPETUALS')}
            </div>
            <h1>{titles[page]}</h1>
            <p>
              {page === 'overview'
                ? t('От рыночных данных — к проверяемой стратегии.')
                : page === 'training'
                  ? t('Обучайте модель. Сравнивайте с базовой стратегией.')
                  : page === 'simulation'
                    ? t('Проверьте решения модели на отложенном участке истории.')
                    : page === 'journal'
                      ? t('Каждое решение, исполнение и результат — в одном месте.')
                      : page === 'data'
                        ? t('Закрытые свечи и история funding из публичного API Bybit.')
                        : t('Прозрачные допущения, воспроизводимые результаты.')}
            </p>
          </div>
          <div class="heading-actions">
            <span class="badge neutral"><i></i> {t('PAPER ONLY')}</span
            >{#if page === 'overview'}<button
                class="primary"
                disabled={busy || !connected}
                onclick={() => {
                  page = 'training';
                }}
                ><Icon name="brain" size={17} />
                {t('Обучить модель')}
                <Icon name="arrow" size={16} /></button
              >{:else if page === 'journal'}<button
                class="secondary"
                disabled={!lab.result}
                onclick={() => save('trades')}
                ><Icon name="download" size={17} /> {t('Экспорт CSV')}</button
              >{:else if page === 'simulation' && lab.result}<button
                class="secondary"
                onclick={() => save('report')}
                ><Icon name="download" size={17} /> {t('Отчёт JSON')}</button
              >{/if}
          </div>
        </section>
        <div class="data-ribbon" class:synthetic={lab.data.synthetic}>
          <div>
            <Icon name={lab.data.synthetic ? 'info' : 'database'} size={16} /><strong
              >{lab.data.synthetic ? t('Демонстрационный набор') : t('История Bybit')}</strong
            ><span
              >{lab.data.synthetic
                ? t('Синтетические цены · результаты не характеризуют рынок')
                : t('{v0} — {v1} · исторические данные', {
                    v0: date(lab.data.start),
                    v1: date(lab.data.end),
                  })}</span
            >
          </div>
          <button onclick={() => (page = 'data')}
            >{lab.data.synthetic ? t('Загрузить Bybit') : t('Управление данными')}
            <Icon name="arrow" size={14} /></button
          >
        </div>
        {#if lab.job?.status === 'running'}<div class="job-bar" role="status">
            <span class="loader small"></span>
            <div>
              <strong
                >{lab.job.kind === 'train'
                  ? t('Обучение модели')
                  : lab.job.kind === 'import'
                    ? t('Загрузка истории')
                    : t('Расчёт')}</strong
              ><span>{t('Operation progress', { progress: integer(lab.job.progress) })}</span>
            </div>
            <progress max="100" value={lab.job.progress}></progress><b>{lab.job.progress}%</b
            ><button class="text-button" onclick={() => run('cancel')}>{t('Отменить')}</button>
          </div>{/if}

        <Tabs id={page} label={titles[page]} items={views[page]} bind:value={sections[page]} />
        <div
          class="page-content"
          class:market-view={page === 'overview' && sections.overview === 'market'}
          id={`${page}-panel`}
          role="tabpanel"
          aria-labelledby={`${page}-tab-${sections[page]}`}
          tabindex="0"
          bind:clientHeight={contentHeight}
        >
          {#if page === 'overview'}
            {#if sections.overview === 'market'}
              <section class="stats-grid">
                <article class="stat">
                  <div class="stat-label">{t('ETH / USDT')} <Icon name="ethereum" size={17} /></div>
                  <div class="stat-value">${money(latest?.close || 0)}</div>
                  <div class="stat-footer">
                    <span class:positive={change >= 0} class:negative={change < 0}
                      >{pct(change)}</span
                    ><span>{t('за последние 24ч набора')}</span>
                  </div>
                </article>
                <article class="stat">
                  <div class="stat-label">
                    {t('Решение модели')}
                    <Icon name="brain" size={17} />
                  </div>
                  <div class="stat-value signal-value">{signal}</div>
                  <div class="stat-footer">
                    {#if lab.model}<span class="accent-text">{number(confidence, 1)}%</span><span
                        >{t('оценка вероятности')}</span
                      >{:else}<span class="muted">{t('Ожидает первого обучения')}</span>{/if}
                  </div>
                </article>
                <article class="stat">
                  <div class="stat-label">
                    {t('Капитал симуляции')}
                    <Icon name="chart" size={17} />
                  </div>
                  <div class="stat-value">
                    {lab.result ? '$' + money(lab.result.finalBalance) : '—'}
                  </div>
                  <div class="stat-footer">
                    {#if lab.result}<span
                        class:positive={lab.result.returnPercent >= 0}
                        class:negative={lab.result.returnPercent < 0}
                        >{pct(lab.result.returnPercent)}</span
                      ><span>{t('после расходов')}</span>{:else}<span class="muted"
                        >{t('Запустите проверку стратегии')}</span
                      >{/if}
                  </div>
                </article>
                <article class="stat">
                  <div class="stat-label">
                    {t('Данные для обучения')}
                    <Icon name="database" size={17} />
                  </div>
                  <div class="stat-value">
                    {integer(lab.data.count)}<small>{t('свечей')}</small>
                  </div>
                  <div class="stat-footer">
                    <span class="mini-tag">15m</span><span class="mini-tag">1h</span><span
                      class="mini-tag">4h</span
                    ><span class="muted">{t('3 таймфрейма')}</span>
                  </div>
                </article>
              </section>
              <div class="market-grid">
                <section class="panel chart-panel">
                  <div class="panel-heading">
                    <div class="instrument">
                      <span class="coin"><Icon name="ethereum" size={26} /></span>
                      <div>
                        <h2>{t('Ethereum')} <span>{t('ETHUSDT')}</span></h2>
                        <p>{t('Perpetual futures')} <span>·</span> {t('Bybit')}</p>
                      </div>
                    </div>
                    <div class="segmented" aria-label={t('Таймфрейм')}>
                      {#each ['15m', '1h', '4h'] as tf}<button
                          class:selected={timeframe === tf}
                          aria-pressed={timeframe === tf}
                          onclick={() => (timeframe = tf)}>{tf}</button
                        >{/each}
                    </div>
                  </div>
                  <PriceChart candles={lab.charts[timeframe]} />
                  <div class="chart-footer">
                    <span><i class="legend-dot green"></i> {t('Закрытые свечи')}</span><span
                      >{time(lab.data.end)}
                      {t('UTC')} <span class="muted">{t('· конец набора')}</span></span
                    >
                  </div>
                </section>
                <section class="panel intelligence">
                  <div class="panel-heading">
                    <h2><Icon name="bolt" size={18} /> {t('AI Insight')}</h2>
                    <span class="badge accent">{t('24 FEATURES')}</span>
                  </div>
                  <h3>{lab.model ? t('Модель готова к проверке') : t('Рынок — это данные.')}</h3>
                  <p>
                    {lab.model
                      ? t(
                          'Модель {v0} обучена на ранней части истории. Проверьте её решения в симуляции.',
                          { v0: lab.model.id },
                        )
                      : t('Объедините сигналы трёх таймфреймов и обучите свою первую модель.')}
                  </p>
                  <div class="insight-rows">
                    <div>
                      <span>{t('Алгоритм')}</span><strong>{t('Softmax regression')}</strong>
                    </div>
                    <div><span>{t('Признаки')}</span><strong>{t('8 × 3 таймфрейма')}</strong></div>
                    <div>
                      <span>{t('Статус')}</span><strong class="accent-text"
                        >{lab.model ? t('Обучена') : t('Готов к обучению')}</strong
                      >
                    </div>
                  </div>
                  <button
                    class="wide secondary"
                    onclick={() => (page = lab?.model ? 'simulation' : 'training')}
                    >{lab.model ? t('Перейти к симуляции') : t('Настроить обучение')}<Icon
                      name="arrow"
                      size={16}
                    /></button
                  >
                </section>
              </div>
            {:else}
              <div class="section-label">
                <h2>{t('Согласованность таймфреймов')}</h2>
                <span>{t('Индикаторы на последней закрытой свече')}</span>
              </div>
              <section class="frames-grid">
                {#each lab.frames as frame}<article class="panel frame-card">
                    <div class="frame-heading">
                      <span class="frame-name">{frame.frame}</span><span
                        class:positive={frame.trend === 'Bullish'}
                        class:negative={frame.trend !== 'Bullish'}
                        class="trend-label"
                        >{frame.trend === 'Bullish' ? t('↗ Восходящий') : t('↘ Нисходящий')}</span
                      >
                    </div>
                    <div class="indicator">
                      <span>{t('RSI')} <small>14</small></span><strong
                        >{number(frame.rsi, 1)}</strong
                      >
                      <div class="rsi-track"><i style:width={`${frame.rsi}%`}></i></div>
                    </div>
                    <div class="frame-bottom">
                      <div>
                        <span>{t('MACD histogram')}</span><b
                          class:positive={frame.macd >= 0}
                          class:negative={frame.macd < 0}>{number(frame.macd, 2)}</b
                        >
                      </div>
                      <div>
                        <span>{t('ATR')} <small>14</small></span><b>${number(frame.atr, 2)}</b>
                      </div>
                      <div>
                        <span>{t('EMA 12 / 26')}</span><b
                          >{t(frame.ema12 > frame.ema26 ? 'Bullish' : 'Bearish')}</b
                        >
                      </div>
                    </div>
                  </article>{/each}
              </section>
              <div class="workflow-strip">
                <span class="step-number">01</span>
                <div>
                  <strong>{t('Данные')}</strong><span
                    >{lab.data.synthetic ? t('Демо-набор') : t('История загружена')}</span
                  >
                </div>
                <Icon name="arrow" size={17} /><span class="step-number">02</span>
                <div>
                  <strong>{t('Обучение')}</strong><span
                    >{lab.model ? t('Модель сохранена') : t('24 признака · 3 класса')}</span
                  >
                </div>
                <Icon name="arrow" size={17} /><span class="step-number">03</span>
                <div>
                  <strong>{t('Симуляция')}</strong><span>{t('Плечо · расходы · риск')}</span>
                </div>
                <button class="text-button" onclick={() => (page = 'method')}
                  >{t('Методология')} <Icon name="arrow" size={16} /></button
                >
              </div>
            {/if}
          {:else if page === 'training'}
            {#if sections.training === 'setup'}
              <section class="panel">
                <div class="panel-heading">
                  <h2>{t('Параметры обучения')}</h2>
                  <span class="badge accent">{t('SUPERVISED ML')}</span>
                </div>
                <form
                  class="panel-body"
                  onsubmit={(e) => {
                    e.preventDefault();
                    void run('train', training);
                  }}
                >
                  <p class="form-description">
                    {t(
                      'Модель учится классифицировать будущее движение цены: short, ожидание или long.',
                    )}
                  </p>
                  <div class="form-grid">
                    <label
                      >{t('Количество эпох')}<input
                        type="number"
                        min="10"
                        max="500"
                        step="5"
                        bind:value={training.epochs}
                        required
                      /><small>{t('Число проходов по обучающей выборке')}</small></label
                    ><label
                      >{t('Скорость обучения')}<input
                        type="number"
                        min="0.001"
                        max="0.2"
                        step="0.001"
                        bind:value={training.learningRate}
                        required
                      /><small>{t('Шаг обновления весов')}</small></label
                    ><label
                      >{t('Горизонт прогноза')}<select bind:value={training.horizon}
                        ><option value={1}>{t('15 минут · 1 свеча')}</option><option value={4}
                          >{t('1 час · 4 свечи')}</option
                        ><option value={8}>{t('2 часа · 8 свечей')}</option><option value={16}
                          >{t('4 часа · 16 свечей')}</option
                        ></select
                      ><small>{t('От открытия следующей свечи')}</small></label
                    ><label
                      >{t('Порог движения')}<select bind:value={training.labelThreshold}
                        ><option value={0.001}>±{number(0.1, 1)}%</option><option value={0.003}
                          >±{number(0.3, 1)}%</option
                        ><option value={0.005}>±{number(0.5, 1)}%</option><option value={0.01}
                          >±{number(1, 1)}%</option
                        ></select
                      ><small>{t('Меньшее движение → ожидание')}</small></label
                    >
                  </div>
                  <div class="split-visual">
                    <span>{t('60% обучение')}</span><span>{t('20% валидация')}</span><span
                      >{t('20% тест')}</span
                    >
                  </div>
                  <p class="note">
                    {t(
                      'Хронологическое разделение с пропуском свечей между выборками. Лучшая эпоха выбирается по ошибке валидации. Повторное обучение заменит текущую модель и её симуляции.',
                    )}
                  </p>
                  <button class="primary wide" type="submit" disabled={busy || !connected}
                    ><Icon name="play" size={17} />{busy
                      ? t('Выполняется операция…')
                      : t('Обучить модель')}</button
                  >
                </form>
              </section>
            {:else if sections.training === 'quality'}
              <section class="panel quality-panel">
                <div class="panel-heading">
                  <h2>{t('Качество модели')}</h2>
                  {#if lab.model}<button
                      class="icon-button"
                      title={t('Экспорт модели')}
                      aria-label={t('Экспорт модели')}
                      onclick={() => save('model')}><Icon name="download" size={18} /></button
                    >{/if}
                </div>
                {#if lab.model}<div class="panel-body">
                    <div class="model-meta">
                      <span class="badge green">{t('ОБУЧЕНА')}</span><span
                        >#{lab.model.id} {t('· эпоха')} {lab.model.bestEpoch}</span
                      >
                    </div>
                    <div class="metrics-inline">
                      <div>
                        <span>{t('Точность на тесте')}</span><strong
                          >{number(lab.model.test.accuracy * 100, 1)}%</strong
                        >
                      </div>
                      <div>
                        <span>{t('Базовая точность')}</span><strong
                          >{number(lab.model.test.baselineAccuracy * 100, 1)}%</strong
                        >
                      </div>
                      <div>
                        <span>{t('Log loss')}</span><strong
                          >{number(lab.model.test.logLoss, 3)}</strong
                        >
                      </div>
                    </div>
                    <LineChart
                      values={lab.model.loss.map((l) => l.train)}
                      secondary={lab.model.loss.map((l) => l.validation)}
                      label={t('Ошибка обучения и валидации по эпохам')}
                    />
                    <div class="chart-legend">
                      <span><i class="legend-dot accent"></i> {t('Обучение')}</span><span
                        ><i class="legend-dot green"></i> {t('Валидация')}</span
                      >
                    </div>
                    <p class="note">
                      {t('База всегда выбирает самый частый класс обучающей выборки. Тест:')}
                      {integer(lab.model.test.samples)}
                      {t('примеров. Точность не измеряет доходность.')}
                    </p>
                  </div>{:else}<div class="empty-state">
                    <span class="empty-icon"><Icon name="brain" size={34} /></span>
                    <h3>{t('Начните первый эксперимент')}</h3>
                    <p>
                      {t(
                        'После обучения здесь появятся ошибка по эпохам и качество на отложенных данных.',
                      )}
                    </p>
                  </div>{/if}
              </section>
            {:else}
              {#if lab.model}<section class="panel feature-panel">
                  <div class="panel-heading">
                    <h2>{t('Влияние признаков на класс Long')}</h2>
                    <span>{t('Коэффициенты стандартизированных признаков')}</span>
                  </div>
                  <div class="feature-grid">
                    {#each lab.features
                      .map((name, i) => ({ name, value: lab!.model!.weights[2][i] }))
                      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                      .slice(0, 9) as feature}<div class="feature-row">
                        <span>{featureLabel(feature.name)}</span>
                        <div>
                          <i style:width={`${Math.min(100, Math.abs(feature.value) * 180)}%`}></i>
                        </div>
                        <b>{number(feature.value, 3)}</b>
                      </div>{/each}
                  </div>
                  <p class="note">
                    {t('Коэффициенты описывают модель, а не причинное влияние на рынок.')}
                  </p>
                </section>{:else}<section class="panel">
                  <div class="empty-state">
                    <Icon name="brain" size={28} />
                    <h3>{t('Начните первый эксперимент')}</h3>
                    <button class="secondary" onclick={() => (sections.training = 'setup')}
                      >{t('Обучить модель')}</button
                    >
                  </div>
                </section>{/if}
            {/if}
          {:else if page === 'simulation'}
            {#if sections.simulation === 'setup'}
              <section class="panel">
                <div class="panel-heading">
                  <h2><Icon name="settings" size={18} /> {t('Исполнение и риск')}</h2>
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
                    {t(
                      '1 bps = 0.01%. Комиссия и маржа — настраиваемые допущения. Funding загружен вместе с историей. Вход на открытии следующей свечи.',
                    )}
                  </p>
                  <button
                    class="primary wide"
                    type="submit"
                    disabled={busy || !connected || !lab.model}
                    ><Icon name="play" size={17} /> {t('Запустить симуляцию')}</button
                  >{#if !lab.model}<button
                      type="button"
                      class="text-button centered"
                      onclick={() => (page = 'training')}>{t('Сначала обучите модель →')}</button
                    >{/if}
                </form>
              </section>
            {:else if sections.simulation === 'result'}
              <div class="simulation-results">
                {#if lab.result}{@const result = lab.result}
                  <section class="stats-grid compact">
                    <article class="stat">
                      <div class="stat-label">{t('Доходность')}</div>
                      <div
                        class="stat-value"
                        class:positive={result.returnPercent >= 0}
                        class:negative={result.returnPercent < 0}
                      >
                        {pct(result.returnPercent)}
                      </div>
                      <div class="stat-footer">{t('После всех расходов')}</div>
                    </article>
                    <article class="stat">
                      <div class="stat-label">{t('Макс. просадка')}</div>
                      <div class="stat-value">{number(result.maxDrawdownPercent, 2)}%</div>
                      <div class="stat-footer">{t('По капиталу на закрытии свечей')}</div>
                    </article>
                    <article class="stat">
                      <div class="stat-label">{t('Сделок / Win rate')}</div>
                      <div class="stat-value">
                        {result.count}<small>{number(result.winRate * 100, 1)}%</small>
                      </div>
                      <div class="stat-footer">
                        {t('Profit factor:')}
                        {result.profitFactor === null ? '—' : number(result.profitFactor, 2)}
                      </div>
                    </article>
                  </section>
                  <section class="panel">
                    <div class="panel-heading">
                      <h2>{t('Кривая капитала')}</h2>
                      <span class="badge" class:amber={result.halted} class:green={!result.halted}
                        >{result.halted ? t('ОСТАНОВКА ПО РИСКУ') : t('ЗАВЕРШЕНО')}</span
                      >
                    </div>
                    <div class="panel-body">
                      <div class="equity-value">
                        ${money(result.finalBalance)}<span>{t('USDT')}</span>
                      </div>
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
                        <div>
                          <span>{t('Комиссии')}</span><strong>${money(result.totalFees)}</strong>
                        </div>
                        <div>
                          <span>{t('Funding (оплачено)')}</span><strong
                            >${money(result.totalFunding)}</strong
                          >
                        </div>
                        <div>
                          <span>{t('Плечо в запуске')}</span><strong
                            >{result.options.leverage}×</strong
                          >
                        </div>
                      </div>
                      <button class="secondary wide" onclick={() => (page = 'journal')}
                        >{t('Открыть журнал сделок')} <Icon name="arrow" size={17} /></button
                      >
                    </div>
                  </section>{:else}<section class="panel fill-height">
                    <div class="empty-state">
                      <span class="empty-icon"><Icon name="chart" size={38} /></span>
                      <h3>{t('Проверьте гипотезу')}</h3>
                      <p>
                        {t(
                          'Симуляция использует последние 20% истории, не участвовавшие в обучении. Результат появится после запуска.',
                        )}
                      </p>
                      <div class="badge neutral">{t('HISTORICAL PAPER TRADING')}</div>
                    </div>
                  </section>{/if}
              </div>
            {:else}
              <section class="panel runs-panel">
                <div class="panel-heading">
                  <h2>{t('История экспериментов')}</h2>
                  <span>{t('Последние 20 запусков текущей модели')}</span>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead
                      ><tr
                        ><th>{t('Запуск')}</th><th>{t('Модель')}</th><th>{t('Доходность')}</th><th
                          >{t('Просадка')}</th
                        ><th>{t('Сделки')}</th><th>{t('Капитал')}</th></tr
                      ></thead
                    ><tbody
                      >{#each runWindow.items as run}<tr
                          ><td>#{run.id}</td><td class="muted">{run.modelId}</td><td
                            class:positive={run.returnPercent >= 0}
                            class:negative={run.returnPercent < 0}>{pct(run.returnPercent)}</td
                          ><td>{number(run.maxDrawdownPercent, 2)}%</td><td>{run.count}</td><td
                            >${money(run.finalBalance)}</td
                          ></tr
                        >{/each}</tbody
                    >
                  </table>
                </div>
                {#if !lab.runs.length}<p class="note table-note">{t('No experiments')}</p>{/if}
                <Pager
                  page={runWindow.page}
                  pages={runWindow.pages}
                  total={runWindow.total}
                  onchange={(value) => (runPage = value)}
                />
              </section>{/if}
          {:else if page === 'journal'}
            <section class="panel">
              <div class="panel-heading">
                <h2>
                  {t('Исполненные сделки')} <span class="count">{lab.result?.count || 0}</span>
                </h2>
                <div class="segmented">
                  {#each [{ id: 'all', text: t('Все') }, { id: 'Long', text: t('Long') }, { id: 'Short', text: t('Short') }] as f}<button
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
                        ><th>{t('Вход · UTC')}</th><th>{t('Сторона')}</th
                        >{#if sections.journal === 'execution'}<th>{t('Цена входа')}</th><th
                            >{t('Цена выхода')}</th
                          ><th>{t('Объём ETH')}</th><th>{t('Результат')}</th>{:else}<th
                            >{t('Exit UTC')}</th
                          ><th>{t('Комиссия')}</th><th>{t('Funding')}</th><th
                            >{t('Причина выхода')}</th
                          >{/if}
                      </tr></thead
                    ><tbody
                      >{#each tradeWindow.items as trade}<tr
                          ><td class="muted">{time(trade.entryTime)}</td><td
                            ><span
                              class="trade-side"
                              class:positive={trade.side === 'Long'}
                              class:negative={trade.side === 'Short'}>{t(trade.side)}</span
                            ></td
                          >{#if sections.journal === 'execution'}<td>{money(trade.entry)}</td><td
                              >{money(trade.exit)}</td
                            ><td>{number(trade.quantity, 4)}</td><td
                              class:positive={trade.pnl >= 0}
                              class:negative={trade.pnl < 0}
                              >{trade.pnl > 0 ? '+' : ''}{money(trade.pnl)}</td
                            >{:else}<td class="muted">{time(trade.exitTime)}</td><td
                              >{money(trade.fees)}</td
                            ><td>{money(trade.funding)}</td><td
                              ><span class="reason">{t(trade.reason)}</span></td
                            >{/if}
                        </tr>{/each}</tbody
                    >
                  </table>
                </div>
                <Pager
                  page={tradeWindow.page}
                  pages={tradeWindow.pages}
                  total={tradeWindow.total}
                  onchange={(value) => (tradePage = value)}
                />
                <p class="note table-note">
                  {t(
                    'Последние 100 сделок последнего запуска. CSV содержит полный журнал. Все суммы — USDT, результат включает расходы.',
                  )}
                </p>{:else}<div class="empty-state">
                  <span class="empty-icon"><Icon name="list" size={36} /></span>
                  <h3>{lab.result ? t('Нет сделок по этому фильтру') : t('Журнал пока пуст')}</h3>
                  <p>
                    {lab.result
                      ? t('Модель может оставаться вне рынка при высоком пороге вероятности.')
                      : t('Запустите симуляцию, чтобы увидеть решения и результаты модели.')}
                  </p>
                  <button class="secondary" onclick={() => (page = 'simulation')}
                    >{t('К симуляции')} <Icon name="arrow" size={16} /></button
                  >
                </div>{/if}
            </section>
          {:else if page === 'data'}
            {#if sections.data === 'import'}
              <section class="panel">
                <div class="panel-heading">
                  <h2>{t('Загрузить историю')}</h2>
                  <span class="bybit-word">{t('BYBIT')}</span>
                </div>
                <form
                  class="panel-body"
                  onsubmit={(e) => {
                    e.preventDefault();
                    void run('import', { days });
                  }}
                >
                  <div class="data-pair">
                    <span class="coin large"><Icon name="ethereum" size={30} /></span>
                    <div>
                      <h3>{t('ETH / USDT')}</h3>
                      <p>{t('USDT perpetual · linear · 15 минут')}</p>
                    </div>
                    <span class="badge neutral">{t('PUBLIC API')}</span>
                  </div>
                  <label
                    >{t('Глубина истории')}<select bind:value={days}
                      ><option value={30}>{t('30 дней · 2 880 свечей')}</option><option value={90}
                        >{t('90 дней · 8 640 свечей')}</option
                      ><option value={180}>{t('180 дней · 17 280 свечей')}</option><option
                        value={360}>{t('360 дней · 34 560 свечей')}</option
                      ></select
                    ></label
                  >
                  <div class="check-list">
                    <p><Icon name="check" size={16} /> {t('Только полностью закрытые свечи')}</p>
                    <p><Icon name="check" size={16} /> {t('Автоматическое построение 1h и 4h')}</p>
                    <p><Icon name="check" size={16} /> {t('Исторические платежи funding')}</p>
                    <p><Icon name="check" size={16} /> {t('Проверка пропусков и целостности')}</p>
                  </div>
                  <p class="note">
                    {t(
                      'Новый набор заменит текущую модель и симуляции. При ошибке загрузки текущая рабочая область сохранится. API-ключ не требуется.',
                    )}
                  </p>
                  <button class="primary wide" type="submit" disabled={busy || !connected}
                    ><Icon name="download" size={17} /> {t('Загрузить данные Bybit')}</button
                  >
                </form>
              </section>
            {:else if sections.data === 'dataset'}
              <section class="panel">
                <div class="panel-heading">
                  <h2>{t('Текущий набор')}</h2>
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
                      <dt>{t('Источник')}</dt>
                      <dd>{lab.data.synthetic ? t('Демонстрационный набор') : lab.data.source}</dd>
                    </div>
                    <div>
                      <dt>{t('Период UTC')}</dt>
                      <dd>{date(lab.data.start)} — {date(lab.data.end)}</dd>
                    </div>
                    <div>
                      <dt>{t('Свечей 15m')}</dt>
                      <dd>{integer(lab.data.count)}</dd>
                    </div>
                    <div>
                      <dt>{t('Funding событий')}</dt>
                      <dd>{lab.data.fundingCount}</dd>
                    </div>
                    <div>
                      <dt>{t('Идентификатор')}</dt>
                      <dd class="mono">{lab.data.id}</dd>
                    </div>
                    <div>
                      <dt>{t('Загружено')}</dt>
                      <dd>{date(lab.data.importedAt)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            {:else}
              <section class="panel">
                <div class="demo-box">
                  <h3>{t('Демо без подключения')}</h3>
                  <p>
                    {t(
                      'Воспроизводимый синтетический набор для проверки функций приложения. Не подходит для оценки торговой стратегии.',
                    )}
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
                      ? t('Подтвердить замену данных и модели')
                      : t('Использовать демо-набор')}</button
                  >{#if resetArmed}<button
                      class="text-button centered"
                      onclick={() => (resetArmed = false)}>{t('Отмена')}</button
                    >{/if}
                </div>
              </section>
            {/if}
          {:else}
            <div class="method-grid">
              {#each [{ n: '01', title: t('Из истории — в признаки'), text: t('Закрытые свечи Bybit ETHUSDT объединяются в 15m, 1h и 4h. На каждом таймфрейме рассчитываются EMA, RSI, MACD, ATR, полосы Боллинджера, объём и импульс. Старшая свеча доступна только после её закрытия.') }, { n: '02', title: t('Модель действительно обучается'), text: t('Многоклассовая логистическая регрессия обновляет веса градиентным спуском. Три класса: short, ожидание, long. Среднее и масштаб признаков вычисляются только на обучающей выборке. Вероятности не калиброваны.') }, { n: '03', title: t('Будущее отделено от прошлого'), text: t('60% истории используются для обучения, 20% для выбора эпохи, 20% для теста. Между выборками исключается горизонт прогноза. Симуляция начинается после первого тестового сигнала, на открытии следующей свечи.') }, { n: '04', title: t('Расходы и исполнение'), text: t('Учитываются комиссия входа и выхода, направленное проскальзывание и исторический funding. Позиция ограничена риском до стопа и доступной маржой. Если свеча задевает стоп и тейк, первым считается стоп.') }, { n: '05', title: t('Границы симуляции'), text: t('Исполнение моделируется по OHLC, без стакана и частичных исполнений. Funding оценивается по цене открытия свечи. Ликвидация приближённая: нет mark price, ступенчатой маржи, ADL и ликвидационной комиссии. Просадка контролируется на закрытии свечи; гэп может превысить лимит.') }, { n: '06', title: t('Как читать результат'), text: t('Бэктест не гарантирует будущей прибыли. Многократная настройка параметров по одному тесту ведёт к переобучению: для нового вывода нужен новый период. Приложение исследовательское: реальных ордеров, ключей биржи и фоновой торговли нет.') }].filter( (item) => (sections.method === 'research' ? Number(item.n) <= 3 : Number(item.n) > 3) ) as item}<section
                  class="panel method-card"
                >
                  <span class="method-number">{item.n}</span>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </section>{/each}
            </div>
          {/if}
        </div>
        <footer class="page-footer">
          <span
            ><Icon name="shield" size={14} />
            {t('Локальная лаборатория. Реальные ордера не отправляются.')}</span
          ><span>{t('ETHUSDT PERPETUAL')} <span>·</span> {t('XKILLER LAB')}</span>
        </footer>
      {/if}
    </main>
  </div>
</div>
{#if toast}<div class="toast" role="status"><Icon name="check" size={18} />{toast}</div>{/if}
