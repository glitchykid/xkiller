<script lang="ts">
  let {
    values,
    secondary = [],
    label = 'Кривая капитала',
    color = '#b5a3ff',
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

<svg viewBox="0 0 810 215" role="img" aria-label={label} class="line-chart">
  <defs
    ><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"
      ><stop offset="0%" stop-color={color} stop-opacity=".18" /><stop
        offset="100%"
        stop-color={color}
        stop-opacity="0"
      /></linearGradient
    ></defs
  >
  {#each [30, 80, 130, 180] as y}<line x1="20" x2="790" y1={y} y2={y} class="grid-line" />{/each}
  {#if values.length}<polygon
      points={`20,200 ${path(values)} 780,200`}
      fill="url(#area)"
    /><polyline points={path(values)} fill="none" stroke={color} stroke-width="2.5" />{/if}
  {#if secondary.length}<polyline
      points={path(secondary)}
      fill="none"
      stroke="#91d5b4"
      stroke-width="2"
    />{/if}
  <text x="20" y="14" class="axis">{max.toFixed(2)}</text><text x="20" y="212" class="axis"
    >{min.toFixed(2)}</text
  >
</svg>
