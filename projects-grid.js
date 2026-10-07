(() => {
  const grid = document.querySelector('#work .project-list');
  const dialog = document.querySelector('#project-dialog');
  if (!grid || !dialog) return;
  const content = dialog.querySelector('.project-dialog-content');
  const closeButton = dialog.querySelector('.project-close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let closing = false;
  let travel = null;
  let savedOverflow, savedPadding;

  function travelTransform(origin, destination) {
    return `translate3d(${origin.left - destination.left}px, ${origin.top - destination.top}px, 0) scale(${origin.width / destination.width}, ${origin.height / destination.height})`;
  }

  function openProject(card) {
    if (active) return;
    const trigger = card.querySelector('.project-tile');
    const origin = trigger.getBoundingClientRect();
    const full = card.querySelector('.project-full');
    active = { card, trigger, full };
    savedOverflow = document.body.style.overflow;
    savedPadding = document.body.style.paddingRight;
    const scrollbar = innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight);
    document.body.style.paddingRight = `${padding + scrollbar}px`;
    document.body.style.overflow = 'hidden';
    dialog.dataset.theme = card.dataset.theme;
    content.append(card.querySelector('.project-circle').cloneNode(true), full);
    full.hidden = false;
    full.querySelector('h3').id = 'project-dialog-title';
    trigger.setAttribute('aria-expanded', 'true');
    dialog.showModal();
    dialog.querySelector('.project-dialog-scroll').scrollTop = 0;
    closeButton.focus({ preventScroll: true });
    const destination = dialog.getBoundingClientRect();
    travel = dialog.animate(reduced.matches ? [{ opacity: 0 }, { opacity: 1 }] : [
      { transform: travelTransform(origin, destination), opacity: .65 },
      { transform: 'none', opacity: 1 }
    ], { duration: reduced.matches ? 100 : 450, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  async function closeProject() {
    if (!active || closing) return;
    closing = true;
    // Finish an interrupted opening before measuring the return journey.
    travel?.finish();
    const destination = dialog.getBoundingClientRect();
    const origin = active.trigger.getBoundingClientRect();
    travel = dialog.animate(reduced.matches ? [{ opacity: 1 }, { opacity: 0 }] : [
      { transform: 'none', opacity: 1 },
      { transform: travelTransform(origin, destination), opacity: .35 }
    ], { duration: reduced.matches ? 100 : 450, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    await travel.finished;
    const { card, trigger, full } = active;
    full.hidden = true;
    full.querySelector('h3').removeAttribute('id');
    card.append(full);
    content.replaceChildren();
    dialog.close();
    travel.cancel();
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPadding;
    trigger.setAttribute('aria-expanded', 'false');
    active = null;
    closing = false;
    trigger.focus({ preventScroll: true });
  }

  grid.querySelectorAll('.project-card').forEach(card => {
    card.querySelector('.project-tile').addEventListener('click', () => openProject(card));
  });
  closeButton.addEventListener('click', closeProject);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeProject();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProject();
  });
})();
