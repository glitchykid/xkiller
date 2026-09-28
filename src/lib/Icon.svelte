<script lang="ts">
  let { name, size = 20, rotate = 0 }: { name: string; size?: number; rotate?: number } = $props();
  const cells: Record<string, number> = {
    grid: 0,
    brain: 1,
    chart: 2,
    list: 3,
    database: 4,
    arrow: 5,
    play: 6,
    download: 7,
    shield: 8,
    info: 9,
    check: 10,
    close: 11,
    bolt: 12,
    settings: 13,
    globe: 14,
    ethereum: 15,
  };
  let cell = $derived(cells[name] ?? cells.chart);
</script>

<span
  class="ui-icon"
  aria-hidden="true"
  style:width={`${size}px`}
  style:height={`${size}px`}
  style:mask-position={`${((cell % 4) / 3) * 100}% ${(Math.floor(cell / 4) / 3) * 100}%`}
  style:transform={`rotate(${rotate}deg)`}
></span>

<style>
  .ui-icon {
    display: inline-block;
    flex-shrink: 0;
    vertical-align: middle;
    background-color: currentColor;
    mask-image: url('/ui-icons.png');
    mask-mode: alpha;
    mask-size: 400% 400%;
    mask-repeat: no-repeat;
    image-rendering: auto;
  }
</style>
