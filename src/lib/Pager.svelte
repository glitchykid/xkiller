<script lang="ts">
  import { t } from './i18n.svelte';
  import { integer } from './format.svelte';
  import Icon from './Icon.svelte';
  let {
    page,
    pages,
    total,
    onchange,
  }: {
    page: number;
    pages: number;
    total: number;
    onchange: (page: number) => void;
  } = $props();
</script>

<div class="pager">
  <span>{t('Records total', { count: integer(total) })}</span>
  <div>
    <button
      type="button"
      class="secondary"
      aria-label={t('Previous page')}
      disabled={page === 0}
      onclick={() => onchange(page - 1)}><Icon name="arrow" size={14} rotate={180} /></button
    >
    <span aria-live="polite"
      >{t('Page of', { page: integer(page + 1), pages: integer(pages) })}</span
    >
    <button
      type="button"
      class="secondary"
      aria-label={t('Next page')}
      disabled={page + 1 >= pages}
      onclick={() => onchange(page + 1)}><Icon name="arrow" size={14} /></button
    >
  </div>
</div>
