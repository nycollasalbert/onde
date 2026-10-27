(() => {
  'use strict';

  const storageKey = 'material-de-estudos-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function savedTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function systemTheme() {
    return media.matches ? 'dark' : 'light';
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || savedTheme() || systemTheme();
  }

  function updateButtons(theme) {
    const next = theme === 'dark' ? 'claro' : 'escuro';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', `Ativar modo ${next}`);
      button.setAttribute('title', `Ativar modo ${next}`);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    });
  }

  function applyTheme(theme, persist = false) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#171221' : '#5b21b6';
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch { /* armazenamento indisponível */ }
    }
    updateButtons(theme);
  }

  function bind(button) {
    if (!button || button.dataset.themeBound === 'true') return;
    button.dataset.themeBound = 'true';
    button.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
    updateButtons(currentTheme());
  }

  applyTheme(savedTheme() || systemTheme());

  window.MaterialTheme = { bind, current: currentTheme };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(bind);
    updateButtons(currentTheme());
  });

  media.addEventListener('change', (event) => {
    if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });
})();
