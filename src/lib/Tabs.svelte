<script lang="ts">
  let {
    id,
    label,
    items,
    value = $bindable(),
  }: {
    id: string;
    label: string;
    items: { id: string; label: string }[];
    value: string;
  } = $props();
  function navigate(event: KeyboardEvent, index: number) {
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % items.length
            : event.key === 'ArrowLeft'
              ? (index + items.length - 1) % items.length
              : -1;
    if (next < 0) return;
    event.preventDefault();
    value = items[next].id;
    document.getElementById(`${id}-tab-${value}`)?.focus();
  }
</script>

<div class="subtabs" role="tablist" aria-label={label}>
  {#each items as item, index}
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${item.id}`}
      aria-selected={value === item.id}
      aria-controls={`${id}-panel`}
      tabindex={value === item.id ? 0 : -1}
      onclick={() => (value = item.id)}
      onkeydown={(event) => navigate(event, index)}
    >
      {item.label}
    </button>
  {/each}
</div>
