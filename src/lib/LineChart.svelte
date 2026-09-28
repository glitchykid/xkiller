<script lang="ts">
  import { t } from './i18n.svelte';
  import { number } from './format.svelte';
  let {
    values,
    secondary = [],
    label = 'Кривая капитала',
    color = 'var(--chart-line)',
  }: { values: number[]; secondary?: number[]; label?: string; color?: string } = $props();
  let min = $derived(Math.min(...values, ...secondary));
  let max = $derived(Math.max(...values, ...secondary));
  let path = $derived((source: number[]) =>
    source
      .map(
        (v, i) =>
          `${20 + (i / Math.max(1, source.length - 1)) * 760},${180 - ((v - min) / Math.max(0.0001, max - min)) * 150}`,
      )
      .join(' '),
  );
</script>

<svg viewBox="0 0 810 215" role="img" aria-label={t(label)} class="line-chart">
  {#each [30, 80, 130, 180] as y}<line x1="20" x2="790" y1={y} y2={y} class="grid-line" />{/each}
  {#if values.length}<polygon
      points={`20,200 ${path(values)} 780,200`}
      fill={color}
      fill-opacity=".08"
    /><polyline points={path(values)} fill="none" stroke={color} stroke-width="2.5" />{/if}
  {#if secondary.length}<polyline
      points={path(secondary)}
      fill="none"
      stroke="var(--positive)"
      stroke-width="2"
    />{/if}
  <text x="20" y="14" class="axis">{number(max, 2)}</text><text x="20" y="212" class="axis"
    >{number(min, 2)}</text
  >
</svg>
