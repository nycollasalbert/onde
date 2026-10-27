(() => {
  'use strict';

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function addToolbar(materials = []) {
    const currentPath = decodeURI(window.location.pathname.replace(/^\//, ''));
    const current = materials.find((material) => material.id === currentPath);
    const toolbar = createElement('nav', 'study-toolbar');
    toolbar.setAttribute('aria-label', 'Navegação do material');

    const home = createElement('a', 'study-home-link', '← Voltar à biblioteca');
    home.href = '/';
    toolbar.append(home);

    if (current) {
      const related = materials.filter((material) => material.id !== current.id && material.subject === current.subject && material.topic === current.topic);
      if (related.length) {
        const group = createElement('div', 'study-related');
        const label = createElement('label', '', 'Neste assunto:');
        const select = createElement('select');
        select.setAttribute('aria-label', `Outros materiais sobre ${current.topic}`);
        const prompt = createElement('option', '', 'Escolha outro material');
        prompt.value = '';
        select.append(prompt);
        for (const material of related) {
          const option = createElement('option', '', material.title);
          option.value = `/${material.url}`;
          select.append(option);
        }
        select.addEventListener('change', () => {
          if (select.value) window.location.assign(select.value);
        });
        group.append(label, select);
        toolbar.append(group);
      }
    }

    const themeButton = createElement('button', 'theme-toggle');
    themeButton.type = 'button';
    themeButton.setAttribute('data-theme-toggle', '');
    themeButton.setAttribute('aria-label', 'Alternar tema');
    themeButton.innerHTML = '<svg class="theme-icon-sun" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="theme-icon-moon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg><span data-theme-label>Modo escuro</span>';
    toolbar.append(themeButton);

    document.body.prepend(toolbar);
    window.MaterialTheme?.bind(themeButton);
  }

  fetch('/data/materiais.json')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
    .then(addToolbar)
    .catch(() => addToolbar());
})();
