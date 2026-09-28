<script lang="ts">
  import { appearance, savePreferences } from './preferences.svelte';
  import { locales, languageNames, type Locale, type Preferences } from '../../shared/preferences';
  import { t } from './i18n.svelte';
  import Icon from './Icon.svelte';
  let { onerror }: { onerror: (message: string) => void } = $props();
  let saving = $state(false);
  async function change(update: Partial<Preferences>) {
    saving = true;
    try {
      await savePreferences({ ...appearance, ...update });
    } catch {
      onerror(t('Не удалось сохранить настройки. Попробуйте ещё раз.'));
    } finally {
      saving = false;
    }
  }
</script>

<div class="appearance-controls">
  <label class="language-picker">
    <Icon name="globe" size={16} />
    <select
      aria-label={t('Язык интерфейса')}
      value={appearance.locale}
      disabled={saving}
      onchange={(e) => change({ locale: e.currentTarget.value as Locale })}
    >
      {#each locales as locale}<option value={locale}>{languageNames[locale]}</option>{/each}
    </select>
  </label>
</div>
