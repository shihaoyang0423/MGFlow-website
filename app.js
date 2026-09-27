'use strict';
let samples = [];
let currentTask = 't2i';
let visibleSamples = [];
let modalSamples = [];
let modalIndex = 0;
let galleryPage = 0;
const pageSize = 16;
const grid = document.querySelector('#sample-grid');
const search = document.querySelector('#sample-search');
const modal = document.querySelector('#sample-modal');

function renderSamples() {
  const term = search.value.trim().toLowerCase();
  visibleSamples = samples.filter(s => s.task === currentTask && `${s.title} ${s.prompt}`.toLowerCase().includes(term));
  const pages = Math.max(1, Math.ceil(visibleSamples.length / pageSize));
  galleryPage = Math.min(galleryPage, pages - 1);
  document.querySelector('#gallery-pagination').hidden = pages <= 1;
  document.querySelector('#gallery-page').textContent = `${galleryPage + 1} / ${pages}`;
  document.querySelector('#gallery-prev').disabled = galleryPage === 0;
  document.querySelector('#gallery-next').disabled = galleryPage === pages - 1;
  grid.replaceChildren();
  if (!visibleSamples.length) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = 'No matching samples. Try another word or switch collections.';
    grid.append(p); return;
  }
  visibleSamples.slice(galleryPage * pageSize, (galleryPage + 1) * pageSize).forEach(s => {
    const button = document.createElement('button'); button.className = 'sample-card';
    button.setAttribute('aria-label', `View ${s.title}`);
    const imageWrap = document.createElement('span'); imageWrap.className = 'image-wrap';
    const img = new Image(); img.src = s.image; img.alt = s.prompt; img.loading = 'lazy';
    img.width = img.height = s.task === 't2i' ? 512 : 256;
    imageWrap.append(img);
    const title = document.createElement('h3'); title.textContent = s.title;
    const subtitle = document.createElement('p'); subtitle.textContent = s.task === 't2i' ? 'FLUX.2 [klein] 4B · 1 step' : `${s.model.split(' + ')[0]} · MGFlow-KL · 1 step`;
    button.append(imageWrap, title, subtitle);
    button.addEventListener('click', () => openSample(s.id, visibleSamples));
    grid.append(button);
  });
}

function showModalSample() {
  const s = modalSamples[modalIndex];
  document.querySelector('#modal-count').textContent = `${modalIndex + 1} / ${modalSamples.length}`;
  const image = document.querySelector('#modal-image'); image.src = s.image; image.alt = s.prompt;
  document.querySelector('#modal-task').textContent = s.task === 't2i' ? 'Text-to-image' : 'Class-conditional ImageNet';
  document.querySelector('#modal-title').textContent = s.title;
  document.querySelector('#modal-prompt').textContent = s.description ? `Image description: ${s.description}` : s.prompt;
  const meta = document.querySelector('#modal-meta'); meta.replaceChildren();
  const entries = [['Model', s.model], ['Resolution', s.resolution], ['Sampling', '1 NFE']];
  if (s.seed !== undefined) entries.push(['Seed', String(s.seed)]);
  entries.forEach(([key,value]) => {
    const dt = document.createElement('dt'); dt.textContent = key;
    const dd = document.createElement('dd'); dd.textContent = value;
    meta.append(dt,dd);
  });
  document.querySelector('#modal-download').href = s.image;
  document.querySelector('#modal-download').download = s.image;
}

function openSample(id, collection) {
  if (!samples.length) return;
  modalSamples = collection || samples.filter(s => s.task === 't2i');
  modalIndex = modalSamples.findIndex(s => s.id === id);
  if (modalIndex < 0) return;
  showModalSample(); modal.showModal(); document.body.style.overflow = 'hidden';
}
function stepModal(delta) {
  modalIndex = (modalIndex + delta + modalSamples.length) % modalSamples.length;
  showModalSample();
}
document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => {
  currentTask = button.dataset.task; search.value = ''; galleryPage = 0;
  document.querySelectorAll('[data-task]').forEach(b => {
    const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#collection-description').textContent = currentTask === 't2i' ? 'FLUX.2 [klein] 4B + MGFlow · 512 × 512 · 1 NFE' : 'pMF-H & JiT-H + MGFlow-KL · ImageNet 256 × 256 · 1 NFE';
  renderSamples();
}));
search.addEventListener('input', () => { galleryPage = 0; renderSamples(); });
document.querySelector('#gallery-prev').addEventListener('click', () => { galleryPage--; renderSamples(); grid.scrollIntoView({block: 'start'}); });
document.querySelector('#gallery-next').addEventListener('click', () => { galleryPage++; renderSamples(); grid.scrollIntoView({block: 'start'}); });

const film = document.querySelector('#hero-film');
const pauseButton = document.querySelector('#film-pause');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let filmPaused = reducedMotion.matches;
let filmHovered = false;
function updatePauseButton() {
  pauseButton.textContent = filmPaused ? '▶' : 'Ⅱ';
  pauseButton.setAttribute('aria-label', filmPaused ? 'Resume automatic scrolling' : 'Pause automatic scrolling');
  pauseButton.setAttribute('aria-pressed', String(filmPaused));
}
function moveFilm(delta) {
  const card = film.firstElementChild;
  if (!card) return;
  const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(film).gap);
  const end = film.scrollWidth - film.clientWidth;
  const next = film.scrollLeft + delta * step;
  film.scrollTo({left: next > end + 1 ? 0 : next < -1 ? end : Math.min(end, next), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
function renderFilm() {
  const collection = samples.filter(s => s.task === 't2i');
  collection.forEach((s, i) => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', `View ${s.title}`);
    const img = new Image(); img.src = s.image; img.alt = s.prompt;
    img.width = img.height = 512; img.loading = i < 3 ? 'eager' : 'lazy';
    if (i === 0) img.fetchPriority = 'high';
    const caption = document.createElement('span'); caption.textContent = s.title;
    button.append(img, caption);
    button.addEventListener('click', () => openSample(s.id, collection));
    film.append(button);
  });
  const updatePosition = () => {
    const step = film.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(film).gap);
    const index = Math.min(collection.length, Math.round(film.scrollLeft / step) + 1);
    document.querySelector('#film-position').textContent = `${String(index).padStart(2, '0')} / ${collection.length}`;
  };
  film.addEventListener('scroll', updatePosition, {passive: true});
  updatePosition();
}
pauseButton.addEventListener('click', () => { filmPaused = !filmPaused; updatePauseButton(); });
document.querySelector('#film-prev').addEventListener('click', () => { filmPaused = true; updatePauseButton(); moveFilm(-1); });
document.querySelector('#film-next').addEventListener('click', () => { filmPaused = true; updatePauseButton(); moveFilm(1); });
film.addEventListener('pointerenter', () => { filmHovered = true; });
film.addEventListener('pointerleave', () => { filmHovered = false; });
film.addEventListener('pointerdown', () => { filmPaused = true; updatePauseButton(); });
film.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); filmPaused = true; updatePauseButton(); moveFilm(e.key === 'ArrowRight' ? 1 : -1);
  }
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { filmPaused = true; updatePauseButton(); } });
updatePauseButton();
setInterval(() => {
  const bounds = film.getBoundingClientRect();
  if (!filmPaused && !filmHovered && !document.hidden && !modal.open && !film.contains(document.activeElement) && bounds.bottom > 0 && bounds.top < window.innerHeight) moveFilm(1);
}, 4500);
document.querySelector('#modal-close').addEventListener('click', () => modal.close());
document.querySelector('#modal-prev').addEventListener('click', () => stepModal(-1));
document.querySelector('#modal-next').addEventListener('click', () => stepModal(1));
modal.addEventListener('close', () => { document.body.style.overflow = ''; });
modal.addEventListener('click', e => {
  const r = modal.getBoundingClientRect();
  if (e.target === modal && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) modal.close();
});
modal.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); stepModal(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); stepModal(1); }
});
function updateDownload() {
  const filename = `${document.querySelector('#backbone').value}_${document.querySelector('#objective').value}.pth`;
  document.querySelector('#imagenet-download').href = `https://huggingface.co/MGFlow/MGFlow/blob/main/ImageNet/${encodeURIComponent(filename)}`;
}
document.querySelector('#backbone').addEventListener('change', updateDownload);
document.querySelector('#objective').addEventListener('change', updateDownload);
fetch('samples.json?v=gallery2').then(r => { if (!r.ok) throw new Error('Sample collection unavailable'); return r.json(); })
  .then(data => {
    samples = data;
    document.querySelectorAll('[data-task]').forEach(button => { button.querySelector('span').textContent = samples.filter(s => s.task === button.dataset.task).length; });
    renderSamples(); renderFilm();
  })
  .catch(() => { grid.textContent = 'The sample gallery could not be loaded. Please reload the page.'; });
