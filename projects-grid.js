(() => {
  const grid = document.querySelector("#work .project-list");
  if (!grid) return;
  const cards = [...grid.querySelectorAll(".project-card")];
  const hover = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = -1;
  let pinned = false;
  let keyboard = false;
  let lockedUntil = 0;
  let leaveTimer;
  let blockedCard = null;
  let pointer = { x: -1, y: -1 };

  function position() {
    if (active < 0) return;
    const columns = Number(getComputedStyle(grid).getPropertyValue("--project-columns"));
    grid.dataset.column = active % columns;
    grid.dataset.row = Math.floor(active / columns);
  }

  function setActive(index, pin = false) {
    clearTimeout(leaveTimer);
    pinned = pin;
    if (index === active) return;
    active = index;
    lockedUntil = performance.now() + (reduced.matches ? 0 : 440);
    cards.forEach((card, i) => {
      const expanded = i === index;
      card.classList.toggle("is-expanded", expanded);
      card.querySelector(".project-toggle").setAttribute("aria-expanded", String(expanded));
      card.querySelector(".project-indicator").textContent = expanded ? "−" : "+";
      const details = card.querySelector(".project-details");
      details.inert = !expanded;
      details.setAttribute("aria-hidden", String(!expanded));
    });
    if (index < 0) {
      delete grid.dataset.column;
      delete grid.dataset.row;
    } else position();
  }

  function pointerInside(card) {
    const rect = card.getBoundingClientRect();
    return pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
  }

  function considerLeaving(force = false) {
    clearTimeout(leaveTimer);
    // A changing grid can emit pointerleave without the pointer moving.
    // Ignore that geometric leave; a real move or grid exit can close it later.
    if (!force && performance.now() < lockedUntil) return;
    leaveTimer = setTimeout(() => {
      if (active < 0 || pinned || document.querySelector(".video-modal")?.open) return;
      if (cards[active].contains(document.activeElement)) return;
      if (!pointerInside(cards[active])) setActive(-1);
    }, Math.max(120, lockedUntil - performance.now() + 60));
  }

  cards.forEach((card, index) => {
    card.querySelector(".project-toggle").setAttribute("aria-expanded", "false");
    card.querySelector(".project-indicator").textContent = "+";
    card.querySelector(".project-details").inert = true;
    card.querySelector(".project-details").setAttribute("aria-hidden", "true");
    card.addEventListener("click", event => {
      if (event.target.closest(".project-actions")) return;
      if (event.target.closest(".project-details")) return;
      const collapse = active === index && pinned;
      blockedCard = collapse ? card : null;
      setActive(collapse ? -1 : index, !collapse);
    });
    card.addEventListener("pointerleave", event => {
      const moved = event.clientX !== pointer.x || event.clientY !== pointer.y;
      pointer = { x: event.clientX, y: event.clientY };
      if (blockedCard === card) blockedCard = null;
      considerLeaving(moved);
    });
  });
  grid.classList.add("projects-ready");

  function pointerHover(event) {
    if (!hover.matches || event.pointerType === "touch") return;
    const moved = event.clientX !== pointer.x || event.clientY !== pointer.y;
    pointer = { x: event.clientX, y: event.clientY };
    const card = event.target.closest(".project-card");
    if (!card || blockedCard === card || pinned || performance.now() < lockedUntil) return;
    // Keep keyboard focus stable; movement alone must not hide a focused action.
    if (active >= 0 && cards[active].contains(document.activeElement)) return;
    const index = cards.indexOf(card);
    if (index !== active && (moved || active < 0)) setActive(index);
  }
  grid.addEventListener("pointerover", pointerHover);
  grid.addEventListener("pointermove", pointerHover, { passive: true });
  grid.addEventListener("pointerleave", event => {
    pointer = { x: event.clientX, y: event.clientY };
    blockedCard = null;
    considerLeaving(true);
  });
  document.addEventListener("pointerdown", () => { keyboard = false; }, { passive: true });
  document.addEventListener("keydown", event => {
    if (event.key === "Tab") {
      keyboard = true;
      blockedCard = null;
    }
    if (event.key === "Escape" && active >= 0 && !document.querySelector(".video-modal")?.open) {
      const card = cards[active];
      blockedCard = card;
      if (card.contains(document.activeElement)) card.querySelector(".project-toggle").focus({ preventScroll: true });
      setActive(-1);
    }
  });
  grid.addEventListener("focusin", event => {
    const card = event.target.closest(".project-card");
    if (keyboard && card && card !== blockedCard) setActive(cards.indexOf(card), true);
  });
  grid.addEventListener("focusout", () => {
    setTimeout(() => {
      if (active >= 0 && keyboard && !cards[active].contains(document.activeElement) && !document.querySelector(".video-modal")?.open) setActive(-1);
    }, 0);
  });
  window.addEventListener("resize", position, { passive: true });
  hover.addEventListener("change", () => { if (!hover.matches && !pinned) setActive(-1); });
})();
