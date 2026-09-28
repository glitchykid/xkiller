<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
    moon: 'M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    brain:
      'M9 18H7a4 4 0 0 1-3-7 4 4 0 0 1 5-6 3 3 0 0 1 6 0 4 4 0 0 1 5 6 4 4 0 0 1-3 7h-2 M12 5v16 M8 9l4 3 4-3 M8 15l4 2 4-2',
    chart: 'M3 3v18h18 M6 15l5-5 4 3 6-8',
    list: 'M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1',
    database:
      'M20 5c0 2-3.6 3-8 3s-8-1-8-3 3.6-3 8-3 8 1 8 3z M4 5v14c0 2 3.6 3 8 3s8-1 8-3V5 M4 12c0 2 3.6 3 8 3s8-1 8-3',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    play: 'M8 4l12 8-12 8z',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
    shield: 'M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6z M8 12l3 3 5-6',
    info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    check: 'M5 12l4 4L19 6',
    refresh: 'M20 7V3l-3 3a8 8 0 1 0 3 12 M20 3h-4',
    close: 'M6 6l12 12 M6 18L18 6',
    bolt: 'M13 2L4 14h7l-1 8 10-13h-7z',
    clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    up: 'M5 16L16 5 M6 5h10v10',
    settings: 'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M10 15v6',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="square"
  stroke-linejoin="miter"
  aria-hidden="true"><path d={paths[name] || paths.chart} /></svg
>
