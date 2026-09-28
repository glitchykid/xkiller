import { mount } from 'svelte';
import App from './App.svelte';
import './styles.css';
import { initializePreferences } from './lib/preferences.svelte';
void initializePreferences().then(() => mount(App, { target: document.getElementById('app')! }));
