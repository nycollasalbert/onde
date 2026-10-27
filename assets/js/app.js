(() => {
  'use strict';

  const SUBJECTS = {
    todos: { name: 'Todos', eyebrow: 'Todos os conteúdos', title: 'Materiais disponíveis', description: 'Conteúdos organizados por matéria e assunto, com acesso direto a cada material disponível.' },
    matematica: { name: 'Matemática', eyebrow: 'Matéria selecionada', title: 'Materiais de Matemática', description: 'Conteúdos de Matemática organizados para apoiar seus estudos.' },
    fisica: { name: 'Física', eyebrow: 'Matéria selecionada', title: 'Materiais de Física', description: 'Conteúdos de Física organizados para apoiar seus estudos.' },
    quimica: { name: 'Química', eyebrow: 'Matéria selecionada', title: 'Materiais de Química', description: 'Conteúdos de Química organizados para apoiar seus estudos.' }
  };

  const state = { materials: [], subject: legacySubjectFromHash(), query: '' };
  const elements = {
    catalog: document.querySelector('#catalog'),
    loading: document.querySelector('#loading-state'),
    empty: document.querySelector('#empty-state'),
    emptyTitle: document.querySelector('#empty-title'),
    emptyDescription: document.querySelector('#empty-description'),
    error: document.querySelector('#error-state'),
    count: document.querySelector('#material-count'),
    search: document.querySelector('#search-input'),
    clearSearch: document.querySelector('#clear-search'),
    searchForm: document.querySelector('#search-form'),
    retry: document.querySelector('#retry-button'),
    eyebrow: document.querySelector('#library-eyebrow'),
    title: document.querySelector('#library-title'),
    library: document.querySelector('.library'),
    pageDescription: document.querySelector('#page-description'),
    links: [...document.querySelectorAll('[data-subject-link]')]
  };

  function legacySubjectFromHash() {
    const value = window.location.hash.slice(1).toLocaleLowerCase('pt-BR');
    return Object.hasOwn(SUBJECTS, value) ? value : 'todos';
  }

  function cleanAddress() {
    if (!window.location.hash) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }

  function pluralize(total) {
    return `${total} ${total === 1 ? 'material' : 'materiais'}`;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createCard(material, index) {
    const card = createElement('a', 'material-card');
    card.href = material.url;
    card.setAttribute('aria-label', `Abrir ${material.title}`);
    card.style.setProperty('--reveal-delay', `${Math.min(index * 65, 390)}ms`);
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
    });
    const top = createElement('div', 'card-top');
    top.append(createElement('span', 'subject-badge', material.subjectLabel), createElement('span', 'type-badge', material.type));
    const action = createElement('span', 'open-label', 'Abrir material');
    action.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>');
    card.append(top, createElement('h4', '', material.title), createElement('p', '', material.description), action);
    return card;
  }

  function groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key];
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(item);
      return groups;
    }, new Map());
  }

  function createSubjectSection(subject, materials) {
    const section = createElement('section', 'subject-section');
    section.setAttribute('aria-labelledby', `heading-${subject}`);
    const heading = createElement('div', 'subject-heading');
    const title = createElement('h3', '', SUBJECTS[subject].name);
    title.id = `heading-${subject}`;
    heading.append(title, createElement('span', 'subject-total', pluralize(materials.length)));
    section.append(heading);
    for (const [topic, topicMaterials] of groupBy(materials, 'topic')) {
      const group = createElement('div', 'topic-group');
      group.append(createElement('p', 'topic-title', topic));
      const grid = createElement('div', 'material-grid');
      grid.append(...topicMaterials.map(createCard));
      group.append(grid);
      section.append(group);
    }
    return section;
  }

  function filteredMaterials() {
    const query = normalize(state.query);
    return state.materials.filter((material) => {
      const matchesSubject = state.subject === 'todos' || material.subject === state.subject;
      const searchable = normalize([material.title, material.topic, material.description, material.type, material.subjectLabel].join(' '));
      return matchesSubject && (!query || searchable.includes(query));
    });
  }

  function updateEmptyState(total) {
    const isSearch = state.query.trim().length > 0;
    elements.empty.hidden = total !== 0;
    if (total !== 0) return;
    if (isSearch) {
      elements.emptyTitle.textContent = 'Nenhum resultado encontrado';
      elements.emptyDescription.textContent = `Não encontramos materiais para “${state.query.trim()}”. Tente outro nome ou assunto.`;
    } else if (state.subject !== 'todos') {
      elements.emptyTitle.textContent = `Nenhum material de ${SUBJECTS[state.subject].name}`;
      elements.emptyDescription.textContent = 'Ainda não há conteúdo publicado nesta matéria.';
    } else {
      elements.emptyTitle.textContent = 'Nenhum material disponível';
      elements.emptyDescription.textContent = 'Ainda não há conteúdo educacional publicado na biblioteca.';
    }
  }

  function render() {
    const materials = filteredMaterials();
    const subject = SUBJECTS[state.subject];
    const grouped = groupBy(materials, 'subject');
    elements.eyebrow.textContent = subject.eyebrow;
    elements.title.textContent = subject.title;
    elements.pageDescription.textContent = subject.description;
    elements.count.textContent = pluralize(materials.length);
    elements.catalog.replaceChildren();
    for (const subjectKey of ['matematica', 'fisica', 'quimica']) {
      const subjectMaterials = grouped.get(subjectKey);
      if (subjectMaterials?.length) elements.catalog.append(createSubjectSection(subjectKey, subjectMaterials));
    }
    updateEmptyState(materials.length);
    elements.links.forEach((link) => {
      if (link.dataset.subjectLink === state.subject) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function loadMaterials() {
    elements.loading.hidden = false;
    elements.error.hidden = true;
    elements.empty.hidden = true;
    elements.catalog.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('data/materiais.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Catálogo indisponível (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new TypeError('O catálogo possui um formato inválido.');
      state.materials = data;
      render();
    } catch (error) {
      console.error('Falha ao carregar o catálogo:', error);
      elements.count.textContent = 'Indisponível';
      elements.catalog.replaceChildren();
      elements.error.hidden = false;
    } finally {
      elements.loading.hidden = true;
      elements.catalog.setAttribute('aria-busy', 'false');
    }
  }

  elements.searchForm.addEventListener('submit', (event) => event.preventDefault());
  elements.search.addEventListener('input', () => {
    state.query = elements.search.value;
    elements.clearSearch.hidden = state.query.length === 0;
    render();
  });
  elements.clearSearch.addEventListener('click', () => {
    elements.search.value = '';
    state.query = '';
    elements.clearSearch.hidden = true;
    render();
    elements.search.focus();
  });
  elements.retry.addEventListener('click', loadMaterials);
  elements.links.forEach((link) => link.addEventListener('click', () => {
    state.subject = link.dataset.subjectLink;
    render();
    elements.library.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  document.querySelector('#home-link').addEventListener('click', (event) => {
    event.preventDefault();
    state.subject = 'todos';
    render();
    document.querySelector('#conteudo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  cleanAddress();
  loadMaterials();
})();
