# Localization

The six supported locales are Russian (`ru`), English (`en`), Ukrainian (`uk`), Korean (`ko`), Japanese (`ja`), and Simplified Chinese (`zh`, HTML language `zh-Hans`). The top-bar selector uses native language names so it remains identifiable after any selection.

## Runtime behavior

`shared/preferences.ts` defines supported locales, native names, and `Intl` locale mappings. The app starts in Russian for a new profile. Appearance is always dark; there is no theme preference or switch.

`src/lib/messages.ts` contains one six-entry translation tuple per message, ordered like the locale registry. `shared/localization.ts` substitutes named placeholders while retaining unknown diagnostic details. `src/lib/i18n.svelte.ts` connects translation to the reactive Svelte preference store; derived navigation, headings, and form labels update immediately without a restart.

`src/lib/format.svelte.ts` formats displayed numbers, percentages, dates, and timestamps with `Intl`. Research timestamps remain UTC in every language. Numeric form values and API payloads stay numeric. CSV and JSON exports retain their stable English field names and invariant numeric representations for reproducible analysis.

Navigation, forms, descriptions, help, chart accessibility labels, status labels, indicator names, trade sides, and exit reasons are translated. Product names, market identifiers, common indicator abbreviations, model/dataset IDs, and timeframe abbreviations remain recognizable. Unrecognized upstream diagnostics are preserved verbatim rather than hidden or guessed. OS-provided file dialogs follow the operating system language.

## Persistence

Electron stores `{ "locale": "ja" }` in `preferences.json` under `userData`. The main process validates the sender and locale, serializes writes, and atomically replaces the file. Legacy files retain a valid language but ignore their theme field, including a saved light choice. Theme-only files default to Russian. The next save writes only the locale. Missing, malformed, and unsupported fields use safe defaults without blocking the research workspace.

The renderer applies a language only after successful persistence. Save failures show a translated notification. Browser development uses `xkiller-preferences` in local storage; the earlier `xkiller-theme` key has no effect.

## Updating translations

Add every new UI message in all six languages and keep its placeholder names consistent. Use `t()` at rendering time or inside a derived expression; do not freeze translated labels in module-level constants. Use the shared number/date formatters instead of hardcoded locales. Keep scientific calculations independent of presentation.

`npm run test:client` checks static Svelte translation keys, all six values, placeholder agreement, interpolation, preference migration, invalid inputs, and persistence without modifying research data. Browser verification covers all six pages in every locale; screenshots and observations are recorded in [verification](VERIFICATION.md).
