// The reveal is temporary; a completed portrait never depends on an animated mask.
class ProfileSplash extends HTMLElement {
  connectedCallback() {
    if (this.events) return;
    this.events = new AbortController();
    const { signal } = this.events;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.pointer = matchMedia("(hover: hover) and (pointer: fine)");
    this.photo = this.querySelector(".portrait-splash-layer");
    this.setupColorReveal(signal);

    if (!this.initialized) {
      this.initialized = true;
      this.state = "pending";
      const id = `portrait-splash-${++ProfileSplash.count}`;
      const mask = this.querySelector("#portrait-splash-mask");
      mask.id = id;
      this.photo.setAttribute("mask", `url(#${id})`);
      const title = this.querySelector("title");
      title.id = `${id}-title`;
      this.querySelector(".portrait-image").setAttribute("aria-labelledby", title.id);
      const gradient = this.querySelector("linearGradient");
      gradient.id = `${id}-fade`;
      const edge = this.querySelector("#portrait-edge-mask");
      edge.id = `${id}-edge`;
      edge.querySelector("rect").setAttribute("fill", `url(#${gradient.id})`);
      this.querySelector(".portrait-image > g").setAttribute("mask", `url(#${edge.id})`);
    }

    this.target = { x: 0, y: 0 };
    const settings = [[12, .05], [-8, .04], [16, .035], [-14, .045]];
    this.layers = [...this.querySelectorAll(".liquid-blob")].map((element, i) => ({
      element, x: 0, y: 0, distance: settings[i][0], easing: settings[i][1]
    }));

    this.querySelector(".s4").addEventListener("animationend", () => {
      this.finishReveal();
    }, { signal });

    if (this.state === "complete" || this.motion.matches || !("IntersectionObserver" in window)) {
      this.finishReveal();
    } else {
      this.classList.add("is-pending");
      this.observer = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) this.startReveal();
      }, { threshold: .2 });
      this.loader = new Image();
      this.loader.onload = () => {
        if (this.isConnected && this.state === "pending") this.observer.observe(this);
      };
      this.loader.onerror = () => this.finishReveal();
      this.loader.src = this.querySelector(".profile-bw").src;
    }

    this.addEventListener("pointerenter", () => {
      this.bounds = this.getBoundingClientRect();
    }, { signal });
    this.addEventListener("pointermove", event => {
      if (this.state !== "complete" || this.motion.matches || !this.pointer.matches || event.pointerType === "touch") return;
      const bounds = this.bounds || (this.bounds = this.getBoundingClientRect());
      const clamp = value => Math.max(-1, Math.min(1, value));
      // Pointer events set one target only. Frames interpolate each background layer.
      this.target.x = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1);
      this.target.y = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1);
      this.scheduleFrame();
    }, { signal });
    const returnToRest = () => {
      this.target.x = this.target.y = 0;
      this.bounds = null;
      this.scheduleFrame();
    };
    this.addEventListener("pointerleave", returnToRest, { signal });
    this.addEventListener("pointercancel", returnToRest, { signal });
    window.addEventListener("blur", returnToRest, { signal });
    window.addEventListener("resize", () => { this.bounds = null; }, { signal, passive: true });
    window.addEventListener("scroll", () => { this.bounds = null; }, { signal, passive: true });
    const preferenceChanged = () => {
      if (this.motion.matches) this.finishReveal();
      if (this.motion.matches || !this.pointer.matches) this.resetLayers();
    };
    this.motion.addEventListener("change", preferenceChanged, { signal });
    this.pointer.addEventListener("change", preferenceChanged, { signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.resetLayers();
    }, { signal });
  }

  startReveal() {
    if (this.state !== "pending") return;
    this.observer?.disconnect();
    if (this.motion.matches) return this.finishReveal();
    this.state = "revealing";
    this.classList.replace("is-pending", "is-revealing");
    // Also finish if an animationend event is lost (e.g. background tab throttling).
    this.revealTimer = setTimeout(() => this.finishReveal(), 2800);
  }

  setupColorReveal(signal) {
    const surface = this.querySelector(".profile-reveal");
    let targetX = 300, targetY = 300, x = 300, y = 300;
    const frame = () => {
      this.colorFrame = null;
      x += (targetX - x) * .2;
      y += (targetY - y) * .2;
      surface.style.setProperty("--x", `${x.toFixed(2)}px`);
      surface.style.setProperty("--y", `${y.toFixed(2)}px`);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .2) {
        this.colorFrame = requestAnimationFrame(frame);
      }
    };
    const update = (event, entering = false) => {
      if (!this.pointer.matches || this.motion.matches || event.pointerType === "touch") return;
      const rect = surface.getBoundingClientRect();
      // The foreignObject uses SVG coordinates; keep the brush ~150 screen pixels.
      const ratio = surface.clientWidth / rect.width;
      targetX = (event.clientX - rect.left) * ratio;
      targetY = (event.clientY - rect.top) * ratio;
      surface.style.setProperty("--reveal-size", `${Math.min(160, rect.width * .34) * ratio}px`);
      if (entering) {
        x = targetX; y = targetY;
        surface.style.setProperty("--x", `${x}px`);
        surface.style.setProperty("--y", `${y}px`);
      }
      surface.classList.add("is-color-revealing");
      if (!this.colorFrame) this.colorFrame = requestAnimationFrame(frame);
    };
    const leave = () => {
      surface.classList.remove("is-color-revealing");
      cancelAnimationFrame(this.colorFrame);
      this.colorFrame = null;
    };
    surface.addEventListener("pointerenter", event => update(event, true), { signal });
    surface.addEventListener("pointermove", event => update(event), { signal, passive: true });
    surface.addEventListener("pointerleave", leave, { signal });
    surface.addEventListener("pointercancel", leave, { signal });
    window.addEventListener("blur", leave, { signal });
    this.motion.addEventListener("change", leave, { signal });
    this.pointer.addEventListener("change", leave, { signal });
    document.addEventListener("visibilitychange", () => { if (document.hidden) leave(); }, { signal });
  }

  finishReveal() {
    clearTimeout(this.revealTimer);
    this.observer?.disconnect();
    this.state = "complete";
    this.photo.removeAttribute("mask");
    this.classList.remove("is-pending", "is-revealing");
    this.classList.add("is-complete");
  }

  scheduleFrame() {
    if (this.frame || this.motion.matches || !this.pointer.matches) return;
    this.classList.add("is-moving");
    this.frame = requestAnimationFrame(time => this.animateLayers(time));
  }

  animateLayers(time) {
    this.frame = null;
    const elapsed = this.previousTime ? Math.min((time - this.previousTime) / (1000 / 60), 3) : 1;
    this.previousTime = time;
    let moving = false;
    this.layers.forEach(layer => {
      const x = this.target.x * layer.distance;
      const y = this.target.y * layer.distance * .8;
      const ease = 1 - Math.pow(1 - layer.easing, elapsed);
      layer.x += (x - layer.x) * ease;
      layer.y += (y - layer.y) * ease;
      if (Math.abs(x - layer.x) + Math.abs(y - layer.y) > .025) moving = true;
      else { layer.x = x; layer.y = y; }
      layer.element.style.transform = `translate3d(${layer.x.toFixed(3)}px, ${layer.y.toFixed(3)}px, 0)`;
    });
    if (moving) this.scheduleFrame();
    else {
      this.previousTime = null;
      this.classList.remove("is-moving");
    }
  }

  resetLayers() {
    cancelAnimationFrame(this.frame);
    this.frame = null;
    this.previousTime = null;
    this.target.x = this.target.y = 0;
    this.layers.forEach(layer => {
      layer.x = layer.y = 0;
      layer.element.style.transform = "translate3d(0, 0, 0)";
    });
    this.classList.remove("is-moving");
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.colorFrame);
    this.colorFrame = null;
    this.finishReveal();
    this.resetLayers();
    this.events?.abort();
    this.events = null;
    if (this.loader) this.loader.onload = this.loader.onerror = null;
  }
}
ProfileSplash.count = 0;
customElements.define("profile-splash", ProfileSplash);
