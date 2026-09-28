import { mount } from 'svelte';
import App from './App.svelte';
import './styles.css';
import { applyTheme, initializeTheme } from './lib/theme';

void initializeTheme()
  .then((theme) => {
    mount(App, { target: document.getElementById('app')!, props: { initialTheme: theme } });
  })
  .catch(() => {
    // A preference failure must not prevent access to the research workspace.
    applyTheme('light');
    mount(App, { target: document.getElementById('app')!, props: { initialTheme: 'light' } });
  });
