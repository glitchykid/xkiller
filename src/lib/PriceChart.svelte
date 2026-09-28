<script lang="ts">
  import type { Candle } from './types';
  import { money, time } from './api';
  let { candles }: { candles: Candle[] } = $props();
  let selected = $state<number | null>(null);
  let low = $derived(Math.min(...candles.map((c) => c.low)) * 0.999);
  let high = $derived(Math.max(...candles.map((c) => c.high)) * 1.001);
  const left = 8,
    width = 810,
    top = 22,
    height = 255;
  let step = $derived(width / candles.length);
  let y = $derived((v: number) => top + ((high - v) / (high - low)) * height);
  let ema = $derived.by(() => {
    let value = candles[0]?.close || 0;
    return candles.map((c) => {
      value = c.close * (2 / 27) + value * (25 / 27);
      return value;
    });
  });
  let line = $derived(ema.map((v, i) => `${left + (i + 0.5) * step},${y(v)}`).join(' '));
  let maxVolume = $derived(Math.max(1, ...candles.map((c) => c.volume)));
</script>

<div class="price-chart">
  <div class="ohlc">
    {#if selected !== null && candles[selected]}{@const c = candles[selected]}<span
        >{time(c.time)} UTC</span
      ><span>O <b>{money(c.open)}</b></span><span>H <b>{money(c.high)}</b></span><span
        >L <b>{money(c.low)}</b></span
      ><span>C <b>{money(c.close)}</b></span>{:else}<span
        ><i class="legend-dot accent"></i> EMA 26</span
      ><span>Наведите на свечу для деталей</span>{/if}
  </div>
  <svg viewBox="0 0 910 360" role="img" aria-label="Свечной график ETH с EMA 26 и объёмом">
    {#each [0, 1, 2, 3, 4] as tick}{@const value = high - ((high - low) * tick) / 4}<line
        x1="8"
        x2="820"
        y1={y(value)}
        y2={y(value)}
        class="grid-line"
      /><text x="836" y={y(value) + 4} class="axis">{money(value)}</text>{/each}
    {#each candles as c, i}{@const x = left + (i + 0.5) * step}{@const color =
        c.close >= c.open ? 'var(--positive)' : 'var(--negative)'}
      <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} />
      <rect
        x={x - step * 0.3}
        y={Math.min(y(c.open), y(c.close))}
        width={step * 0.6}
        height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}
        fill={color}
      />
      <rect
        x={x - step * 0.3}
        y={326 - (c.volume / maxVolume) * 30}
        width={step * 0.6}
        height={(c.volume / maxVolume) * 30}
        fill={color}
        opacity=".24"
      />
      <rect
        x={x - step / 2}
        y="0"
        width={step}
        height="330"
        fill="transparent"
        role="presentation"
        onpointerenter={() => (selected = i)}
        onpointerleave={() => (selected = null)}
      />
    {/each}
    <polyline
      points={line}
      fill="none"
      stroke="var(--chart-line)"
      stroke-width="1.7"
      pointer-events="none"
    />
    {#if selected !== null}<line
        x1={left + (selected + 0.5) * step}
        x2={left + (selected + 0.5) * step}
        y1="10"
        y2="327"
        stroke="var(--muted)"
        stroke-dasharray="3 4"
        pointer-events="none"
      />{/if}
    {#each [0, 0.25, 0.5, 0.75, 1] as t}{@const i = Math.min(
        candles.length - 1,
        Math.floor(t * (candles.length - 1)),
      )}<text
        x={left + (i + 0.5) * step}
        y="352"
        class="axis"
        text-anchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}>{time(candles[i].time)}</text
      >{/each}
  </svg>
</div>
