/**
 * GPT Image 2 Prompt Gallery
 * Vanilla JS — brutalist style, no frameworks.
 */

;(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let allTemplates = [];
  let filtered = [];
  let categories = {};
  let activeCategory = 'All';
  let searchQuery = '';
  let renderedCount = 0;
  let modalOpen = false;
  let lightboxOpen = false;
  let currentModalItem = null;

  const BATCH_SIZE = 60;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const gallery      = $('gallery');
  const sentinel     = $('sentinel');
  const searchInput  = $('search-input');
  const catFilter    = $('category-filter');
  const pillsContainer = $('pills');
  const resultCount  = $('result-count');
  const statsTotal   = $('stat-total');
  const statsCats    = $('stat-categories');
  const modal        = $('modal');
  const modalImage   = $('modal-image');
  const modalTitle   = $('modal-title');
  const modalSummary = $('modal-summary');
  const modalTags    = $('modal-tags');
  const modalPrompt  = $('modal-prompt');
  const modalFoot    = $('modal-foot');
  const modalCategory = $('modal-category');
  const btnCopy      = $('btn-copy');
  const modalClose   = $('modal-close');
  const btnExpand    = $('btn-expand');
  const lightbox     = $('lightbox');
  const lightboxImg  = $('lightbox-img');
  const lightboxClose = $('lightbox-close');

  // ── Utilities ──────────────────────────────────────────────────────────────

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── URL Hash ───────────────────────────────────────────────────────────────

  function writeHash() {
    const p = new URLSearchParams();
    if (searchQuery) p.set('q', searchQuery);
    if (activeCategory !== 'All') p.set('cat', activeCategory);
    const h = p.toString();
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }

  function readHash() {
    const h = location.hash.slice(1);
    if (!h) return;
    const p = new URLSearchParams(h);
    if (p.has('q')) { searchQuery = p.get('q'); searchInput.value = searchQuery; }
    if (p.has('cat')) { activeCategory = p.get('cat'); }
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  async function loadData() {
    try {
      const res = await fetch('prompts.json');
      const data = await res.json();
      allTemplates = data.templates || [];
      readHash();
      buildCategories();
      applyFilters();
      renderStats();
      renderPills();
      loadBatch();
      observeSentinel();
    } catch (err) {
      console.error('Failed to load prompts.json', err);
      gallery.innerHTML = '<p style="padding:40px;color:var(--text-faint)">Failed to load prompts.json</p>';
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  function buildCategories() {
    categories = {};
    for (const t of allTemplates) {
      const c = t.category || 'General';
      categories[c] = (categories[c] || 0) + 1;
    }
  }

  function renderStats() {
    const total = allTemplates.length;
    const catCount = Object.keys(categories).length;
    statsTotal.textContent = total.toLocaleString();
    statsCats.textContent = catCount;
  }

  function renderPills() {
    pillsContainer.innerHTML = '';
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    // "All" pill
    pillsContainer.appendChild(makePill('All', allTemplates.length));
    for (const [name, count] of sorted) {
      pillsContainer.appendChild(makePill(name, count));
    }
    highlightPills();

    // Also populate the select dropdown
    catFilter.innerHTML = '<option value="">ALL</option>';
    for (const [name, count] of sorted) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${count})`;
      catFilter.appendChild(opt);
    }
    catFilter.value = activeCategory === 'All' ? '' : activeCategory;
  }

  function makePill(name, count) {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.category = name;
    btn.innerHTML = name === 'All'
      ? 'ALL'
      : `${esc(name)}<span class="pill-count">${count}</span>`;
    btn.addEventListener('click', () => {
      activeCategory = name;
      catFilter.value = name === 'All' ? '' : name;
      applyFilters();
      resetGallery();
      loadBatch();
      highlightPills();
      writeHash();
    });
    return btn;
  }

  function highlightPills() {
    for (const p of pillsContainer.querySelectorAll('.pill')) {
      p.classList.toggle('active', p.dataset.category === activeCategory);
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();
    filtered = allTemplates.filter((t) => {
      if (activeCategory !== 'All') {
        if ((t.category || 'General') !== activeCategory) return false;
      }
      if (q) {
        const title = (t.title || '').toLowerCase();
        const summary = (t.summary || '').toLowerCase();
        const tags = (t.tags || []).join(' ').toLowerCase();
        if (!title.includes(q) && !summary.includes(q) && !tags.includes(q)) return false;
      }
      return true;
    });
    updateCount();
  }

  function updateCount() {
    const n = filtered.length;
    const total = allTemplates.length;
    resultCount.textContent = n === total
      ? `${total.toLocaleString()} prompts`
      : `${n.toLocaleString()} / ${total.toLocaleString()} prompts`;
    // Also update the stat number to show filtered count
    statsTotal.textContent = n === total
      ? total.toLocaleString()
      : `${n.toLocaleString()} / ${total.toLocaleString()}`;
  }

  // ── Gallery rendering ──────────────────────────────────────────────────────

  function resetGallery() {
    gallery.innerHTML = '';
    renderedCount = 0;
  }

  function loadBatch() {
    const end = Math.min(renderedCount + BATCH_SIZE, filtered.length);
    if (renderedCount >= end) return;

    const frag = document.createDocumentFragment();
    for (let i = renderedCount; i < end; i++) {
      frag.appendChild(createCard(filtered[i], i));
    }
    gallery.appendChild(frag);
    renderedCount = end;
    observeCards();
  }

  function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    card.style.animationDelay = `${(index % BATCH_SIZE) * 20}ms`;

    const tags = (item.tags || []).slice(0, 3);
    const cat = item.category || 'General';
    const imgSrc = item.previewImageUrl || '';

    card.innerHTML = `
      <div class="card-thumb">
        ${imgSrc
          ? `<img loading="lazy" src="${esc(imgSrc)}" alt="${esc(item.title || '')}">`
          : `<div class="card-thumb-placeholder">#</div>`
        }
      </div>
      <div class="card-meta">
        <div class="card-title">${esc(item.title || 'Untitled')}</div>
        <div class="card-summary">${esc(item.summary || '')}</div>
        <div class="card-tags">
          <span class="tag tag-cat">${esc(cat)}</span>
          ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        ${item.source ? `<div class="card-source">${esc(item.source.author || item.source.repo || '')}</div>` : ''}
      </div>
    `;

    card.addEventListener('click', () => openModal(item));
    return card;
  }

  // ── Infinite scroll ────────────────────────────────────────────────────────

  let scrollObs;

  function observeSentinel() {
    if (scrollObs) scrollObs.disconnect();
    scrollObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedCount < filtered.length) {
          loadBatch();
        }
      },
      { rootMargin: '600px' }
    );
    scrollObs.observe(sentinel);
    sentinel.classList.add('active');
  }

  // ── Card fade-in ───────────────────────────────────────────────────────────

  let cardObs;

  function observeCards() {
    if (!cardObs) {
      cardObs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              cardObs.unobserve(e.target);
            }
          }
        },
        { rootMargin: '50px' }
      );
    }
    for (const c of gallery.querySelectorAll('.card:not(.observed)')) {
      c.classList.add('observed');
      cardObs.observe(c);
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = debounce(() => {
    searchQuery = searchInput.value;
    applyFilters();
    resetGallery();
    loadBatch();
    writeHash();
  }, 200);

  searchInput.addEventListener('input', handleSearch);

  // ── Category dropdown ──────────────────────────────────────────────────────

  catFilter.addEventListener('change', () => {
    activeCategory = catFilter.value || 'All';
    applyFilters();
    resetGallery();
    loadBatch();
    highlightPills();
    writeHash();
  });

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openModal(item) {
    currentModalItem = item;
    modalOpen = true;

    modalImage.src = item.previewImageUrl || '';
    modalImage.alt = item.title || '';
    modalTitle.textContent = item.title || 'Untitled';
    modalSummary.textContent = item.summary || '';
    modalPrompt.textContent = item.prompt || '';
    modalCategory.textContent = item.category || 'General';

    // Tags
    modalTags.innerHTML = '';
    for (const tag of item.tags || []) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      modalTags.appendChild(span);
    }

    // Model & aspect
    if (item.model) {
      const m = document.createElement('span');
      m.className = 'tag';
      m.textContent = item.model;
      modalTags.appendChild(m);
    }
    if (item.aspect) {
      const a = document.createElement('span');
      a.className = 'tag';
      a.textContent = item.aspect;
      modalTags.appendChild(a);
    }

    // Source footer
    const src = item.source || {};
    const parts = [src.author, src.repo, src.license].filter(Boolean);
    modalFoot.innerHTML = `<span>Source: ${esc(parts.join(' · '))}</span>` +
      (src.url ? ` <a href="${esc(src.url)}" target="_blank" rel="noopener">link</a>` : '');

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (lightboxOpen) return;
    modalOpen = false;
    currentModalItem = null;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  modalClose.addEventListener('click', closeModal);

  // Copy
  btnCopy.addEventListener('click', async () => {
    if (!currentModalItem) return;
    try {
      await navigator.clipboard.writeText(currentModalItem.prompt || '');
      const txt = btnCopy.querySelector('.copy-text');
      const iconCopy = btnCopy.querySelector('.icon-copy');
      const iconCheck = btnCopy.querySelector('.icon-check');
      txt.textContent = 'copied!';
      iconCopy.style.display = 'none';
      iconCheck.style.display = '';
      btnCopy.classList.add('copied');
      setTimeout(() => {
        txt.textContent = 'copy';
        iconCopy.style.display = '';
        iconCheck.style.display = 'none';
        btnCopy.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  });

  // ── Lightbox ───────────────────────────────────────────────────────────────

  function openLightbox() {
    if (!currentModalItem) return;
    lightboxOpen = true;
    lightboxImg.src = currentModalItem.previewImageUrl || '';
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightboxOpen = false;
    lightbox.hidden = true;
  }

  btnExpand.addEventListener('click', openLightbox);
  modalImage.addEventListener('click', openLightbox);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxOpen) closeLightbox();
      else if (modalOpen) closeModal();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  loadData();
})();
