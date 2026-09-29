'use strict';
let samples = [];
let visibleSamples = [];
let modalSamples = [];
let modalIndex = 0;
const grid = document.querySelector('#sample-grid');
const search = document.querySelector('#sample-search');
const modal = document.querySelector('#sample-modal');

function renderSamples() {
  const term = search.value.trim().toLowerCase();
  visibleSamples = samples.filter(s => s.gallery !== false && `${s.title} ${s.prompt}`.toLowerCase().includes(term));
  grid.replaceChildren();
  if (!visibleSamples.length) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = 'No matching samples. Try another word.';
    grid.append(p); return;
  }
  visibleSamples.forEach(s => {
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
  showModalSample(); modal.showModal(); document.body.style.overflow = 'hidden'; updateFilmPlayback();
}
function stepModal(delta) {
  modalIndex = (modalIndex + delta + modalSamples.length) % modalSamples.length;
  showModalSample();
}
search.addEventListener('input', renderSamples);

const filmTrack = document.querySelector('#film-track');
const pauseButton = document.querySelector('#film-pause');
let filmPaused = false;
function updateFilmPlayback() {
  pauseButton.textContent = filmPaused ? '▶' : 'Ⅱ';
  pauseButton.setAttribute('aria-label', filmPaused ? 'Resume automatic scrolling' : 'Pause automatic scrolling');
  pauseButton.setAttribute('aria-pressed', String(filmPaused));
  filmTrack.classList.toggle('is-paused', filmPaused || modal.open);
}
function renderFilm() {
  const collection = samples;
  const group = document.createElement('div'); group.className = 'film-group';
  collection.forEach((s, i) => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', `View ${s.title}`);
    const img = new Image(); img.src = s.image; img.alt = s.prompt;
    img.width = img.height = 512; img.loading = 'eager';
    if (i === 0) img.fetchPriority = 'high';
    const caption = document.createElement('span'); caption.textContent = s.title;
    button.append(img, caption);
    button.addEventListener('click', () => openSample(s.id, collection));
    group.append(button);
  });
  // Two identical groups make the loop boundary visually continuous.
  const repeat = group.cloneNode(true);
  repeat.setAttribute('aria-hidden', 'true');
  repeat.querySelectorAll('button').forEach((button, i) => {
    button.tabIndex = -1;
    button.addEventListener('click', () => openSample(collection[i].id, collection));
  });
  filmTrack.replaceChildren(group, repeat);
  const updateSize = () => {
    const distance = group.getBoundingClientRect().width;
    filmTrack.style.setProperty('--film-distance', `${distance}px`);
    filmTrack.style.setProperty('--film-duration', `${distance / 28}s`);
  };
  new ResizeObserver(updateSize).observe(group);
  updateSize();
  updateFilmPlayback();
}
pauseButton.addEventListener('click', () => { filmPaused = !filmPaused; updateFilmPlayback(); });
updateFilmPlayback();
document.querySelector('#modal-close').addEventListener('click', () => modal.close());
document.querySelector('#modal-prev').addEventListener('click', () => stepModal(-1));
document.querySelector('#modal-next').addEventListener('click', () => stepModal(1));
modal.addEventListener('close', () => { document.body.style.overflow = ''; updateFilmPlayback(); });
modal.addEventListener('click', e => {
  const r = modal.getBoundingClientRect();
  if (e.target === modal && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) modal.close();
});
modal.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); stepModal(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); stepModal(1); }
});
function updateDownload() {
  const backbone = document.querySelector('#backbone').value;
  const objective = document.querySelector('#objective');
  const filename = `${backbone}_${objective.value}.pth`;
  document.querySelector('#imagenet-download').href = `https://huggingface.co/shy0423/MGFlow/blob/main/Checkpoints/ImageNet/Post-trained/${encodeURIComponent(filename)}`;
  document.querySelector('#imagenet-checkpoint-detail').textContent = `${backbone} · ${objective.selectedOptions[0].text} weights · 1 step`;
  document.querySelector('#imagenet-base-download').href = `https://huggingface.co/shy0423/MGFlow/blob/main/Checkpoints/ImageNet/Base/${encodeURIComponent(backbone)}.pth`;
  document.querySelector('#imagenet-base-detail').textContent = `${backbone} · pretrained weights`;
}
document.querySelector('#backbone').addEventListener('change', updateDownload);
document.querySelector('#objective').addEventListener('change', updateDownload);
updateDownload();
fetch('samples.json?v=gallery4').then(r => { if (!r.ok) throw new Error('Sample collection unavailable'); return r.json(); })
  .then(data => {
    samples = data.filter(s => s.task === 't2i');
    renderSamples(); renderFilm();
  })
  .catch(() => { grid.textContent = 'The sample gallery could not be loaded. Please reload the page.'; });
