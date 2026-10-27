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

    document.body.prepend(toolbar);
  }

  fetch('/data/materiais.json')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
    .then(addToolbar)
    .catch(() => addToolbar());
})();
