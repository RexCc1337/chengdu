/* =========================================================
   成都 · CHENGDU CITY GUIDE
   Interaction & motion layer
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* -------------------------------------------------------
     Loading screen
     ------------------------------------------------------- */
  const initLoader = () => {
    const loader = $('#loader');
    const bar = $('#loaderBar');
    const count = $('#loaderCount');
    const body = document.body;

    if (!loader) {
      body.classList.remove('is-loading');
      body.classList.add('is-ready');
      return;
    }

    if (prefersReduced) {
      loader.classList.add('is-done');
      body.classList.remove('is-loading');
      body.classList.add('is-ready');
      window.setTimeout(() => loader.remove(), 100);
      return;
    }

    const start = performance.now();
    const duration = 1500;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (bar) bar.style.width = '100%';
      if (count) count.textContent = '100';
      window.setTimeout(() => {
        loader.classList.add('is-done');
        body.classList.remove('is-loading');
        body.classList.add('is-ready');
        window.setTimeout(() => loader.remove(), 1300);
      }, 220);
    };

    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = String(Math.round(eased * 100));
      if (bar) bar.style.width = `${eased * 100}%`;
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    requestAnimationFrame(tick);

    /* Never trap the visitor on a slow asset */
    window.setTimeout(finish, 2800);
    window.addEventListener('load', () => window.setTimeout(finish, 900), { once: true });
  };

  /* -------------------------------------------------------
     Header, progress & scroll spy
     ------------------------------------------------------- */
  const initHeader = () => {
    const header = $('#siteHeader');
    const bar = $('#scrollBar');
    const links = $$('[data-nav]');
    const sections = $$('#about, #landmarks, #flavor, #life, #journey, #guide');
    if (!header) return;

    let ticking = false;

    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('is-scrolled', y > 72);
      if (bar) bar.style.width = `${max > 0 ? clamp((y / max) * 100, 0, 100) : 0}%`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = `#${entry.target.id}`;
            links.forEach((link) => {
              link.classList.toggle('is-active', link.getAttribute('href') === id);
            });
          });
        },
        { rootMargin: '-38% 0px -54% 0px', threshold: 0 }
      );
      sections.forEach((section) => spy.observe(section));
    }
  };

  /* -------------------------------------------------------
     Mobile menu
     ------------------------------------------------------- */
  const initMenu = () => {
    const btn = $('#menuBtn');
    const menu = $('#mobileMenu');
    if (!btn || !menu) return;

    let lastFocus = null;
    const open = () => {
      lastFocus = document.activeElement;
      document.body.classList.add('menu-open');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', '关闭菜单');
    };
    const close = () => {
      document.body.classList.remove('menu-open');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', '打开菜单');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    const toggle = () => (menu.classList.contains('is-open') ? close() : open());

    btn.addEventListener('click', toggle);
    $$('[data-mobile-link]', menu).forEach((link) => {
      link.addEventListener('click', () => window.setTimeout(close, 80));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
      if (e.key !== 'Tab' || !menu.classList.contains('is-open')) return;
      const focusables = $$('a[href], button', menu);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && menu.classList.contains('is-open')) close();
    });
  };

  /* -------------------------------------------------------
     Smooth anchors (with fixed-header offset)
     ------------------------------------------------------- */
  const initAnchors = () => {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        if (link.matches('[data-play-film]')) return;
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 58;
        window.scrollTo({ top: Math.max(0, top), behavior: prefersReduced ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  };

  /* -------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------- */
  const initReveal = () => {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.08 }
    );
    items.forEach((item) => observer.observe(item));
  };

  /* -------------------------------------------------------
     Number counters
     ------------------------------------------------------- */
  const initCounters = () => {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    const run = (el) => {
      const target = Number(el.dataset.count) || 0;
      if (prefersReduced) {
        el.textContent = String(target);
        return;
      }
      const start = performance.now();
      const duration = 1500;
      const tick = (now) => {
        const p = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = String(target);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => observer.observe(c));
  };

  /* -------------------------------------------------------
     City film
     ------------------------------------------------------- */
  const initCinema = () => {
    const section = $('#cinema');
    const video = $('#cityFilm');
    const frame = $('#cinemaFrame');
    const trigger = $('#cinemaPlay');
    const openers = $$('[data-play-film]');
    if (!section || !video || !frame) return;

    const playFilm = () => {
      frame.classList.add('is-playing');
      video.controls = true;
      video.muted = false;
      video.volume = 0.8;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          frame.classList.remove('is-playing');
          video.controls = false;
        });
      }
    };

    const goPlay = (event) => {
      event.preventDefault();
      if (document.body.classList.contains('menu-open')) {
        document.getElementById('menuBtn')?.click();
      }
      playFilm();
      const top = frame.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReduced ? 'auto' : 'smooth' });
    };

    openers.forEach((btn) => btn.addEventListener('click', goPlay));
    trigger?.addEventListener('click', (event) => {
      event.preventDefault();
      playFilm();
    });
    video.addEventListener('play', () => frame.classList.add('is-playing'));
  };

  /* -------------------------------------------------------
     City soundtrack
     ------------------------------------------------------- */
  const initMusic = () => {
    const audio = $('#cityMusic');
    if (!audio) return;
    audio.volume = 0.72;

    const toggles = $$('[data-audio-toggle]');
    const ranges = $$('[data-audio-range]');
    const bars = $$('[data-audio-bar]');
    const currents = $$('[data-audio-current]');
    const durations = $$('[data-audio-duration]');
    const inline = $('#nightAudio');
    const mini = $('#miniPlayer');
    const inlineText = inline ? $('.audio-play__text', inline) : null;
    const film = $('#cityFilm');
    let inlineVisible = false;
    let cinemaVisible = false;
    let hasPlayed = false;
    let miniDismissed = false;
    let scrollTick = false;

    const format = (seconds) => {
      if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const updateMini = () => {
      if (!mini) return;
      const shouldShow =
        hasPlayed &&
        !miniDismissed &&
        !document.body.classList.contains('menu-open') &&
        !inlineVisible &&
        !cinemaVisible &&
        window.scrollY > 160;
      mini.classList.toggle('is-visible', shouldShow);
      mini.setAttribute('aria-hidden', String(!shouldShow));
    };

    const sync = () => {
      const playing = !audio.paused && !audio.ended;
      document.body.classList.toggle('music-playing', playing);
      toggles.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(playing));
        btn.setAttribute(
          'aria-label',
          playing ? '暂停城市音乐：蔡琴《明月几时有》' : '播放城市音乐：蔡琴《明月几时有》'
        );
      });
      if (inlineText) inlineText.textContent = playing ? '暂停音乐' : '播放音乐';

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const progress = duration ? clamp((audio.currentTime / duration) * 100, 0, 100) : 0;
      ranges.forEach((range) => {
        if (document.activeElement !== range) range.value = String(progress);
        range.style.setProperty('--progress', `${progress}%`);
      });
      bars.forEach((bar) => {
        bar.style.width = `${progress}%`;
      });
      currents.forEach((el) => {
        el.textContent = format(audio.currentTime);
      });
      durations.forEach((el) => {
        el.textContent = duration ? format(duration) : '--:--';
      });
      updateMini();
    };

    const play = () => {
      if (film && !film.paused) film.pause();
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => sync());
      }
    };

    const toggle = () => {
      if (audio.paused) play();
      else audio.pause();
    };

    toggles.forEach((btn) => btn.addEventListener('click', toggle));
    ranges.forEach((range) => {
      range.addEventListener('input', () => {
        if (!Number.isFinite(audio.duration)) return;
        audio.currentTime = (Number(range.value) / 100) * audio.duration;
        sync();
      });
    });

    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('durationchange', sync);
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('play', () => {
      hasPlayed = true;
      miniDismissed = false;
      sync();
    });
    audio.addEventListener('pause', sync);
    audio.addEventListener('ended', sync);

    const closeMini = $('#miniClose');
    if (closeMini) {
      closeMini.addEventListener('click', () => {
        miniDismissed = true;
        updateMini();
        document.getElementById('musicBtn')?.focus({ preventScroll: true });
      });
    }

    if (film) {
      film.addEventListener('play', () => {
        if (!audio.paused) audio.pause();
      });
    }

    const jump = $('[data-music-jump]');
    if (jump && inline) {
      jump.addEventListener('click', () => {
        const top = inline.getBoundingClientRect().top + window.scrollY - 92;
        window.scrollTo({ top: Math.max(0, top), behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }

    const onScroll = () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        scrollTick = false;
        updateMini();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateMini);

    if ('IntersectionObserver' in window) {
      if (inline) {
        const inlineObserver = new IntersectionObserver(
          ([entry]) => {
            inlineVisible = entry.isIntersecting;
            updateMini();
          },
          { threshold: 0.2 }
        );
        inlineObserver.observe(inline);
      }
      const cinema = $('#cinema');
      if (cinema) {
        const cinemaObserver = new IntersectionObserver(
          ([entry]) => {
            cinemaVisible = entry.isIntersecting;
            updateMini();
          },
          { threshold: 0.08 }
        );
        cinemaObserver.observe(cinema);
      }
    }

    sync();
  };

  /* -------------------------------------------------------
     Landmark horizontal rail
     ------------------------------------------------------- */
  const initRail = () => {
    const rail = $('#landmarkRail');
    if (!rail) return;
    const cards = $$('.place', rail);
    const bar = $('#railBar');
    const count = $('#railCount');
    const prev = $('#railPrev');
    const next = $('#railNext');

    const gap = () => parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || '0') || 0;
    const step = () => {
      if (!cards.length) return 320;
      return cards[0].getBoundingClientRect().width + gap();
    };

    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 0 ? clamp(rail.scrollLeft / max, 0, 1) : 0;
      if (bar) {
        const visible = max > 0 ? Math.max(0.125, rail.clientWidth / rail.scrollWidth) : 1;
        bar.style.width = `${visible * 100}%`;
        bar.style.transform = `translateX(${p * ((1 - visible) / visible) * 100}%)`;
      }
      if (count && cards.length) {
        let index = 0;
        const left = rail.scrollLeft + 20;
        cards.forEach((card, i) => {
          if (card.offsetLeft - rail.offsetLeft <= left) index = i;
        });
        count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      }
    };

    rail.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync);
    sync();

    const scrollByCard = (dir) => {
      rail.scrollBy({ left: dir * step(), behavior: prefersReduced ? 'auto' : 'smooth' });
    };
    prev?.addEventListener('click', () => scrollByCard(-1));
    next?.addEventListener('click', () => scrollByCard(1));

    rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByCard(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByCard(-1);
      }
    });

    // Mouse drag only — touch keeps native momentum scrolling.
    if (finePointer) {
      let down = false;
      let moved = false;
      let startX = 0;
      let startLeft = 0;

      rail.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true;
        moved = false;
        startX = e.clientX;
        startLeft = rail.scrollLeft;
      });
      rail.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) < 6) return;
        if (!moved) {
          rail.classList.add('is-dragging');
          moved = true;
        }
        e.preventDefault();
        rail.scrollLeft = startLeft - dx;
      });
      const end = () => {
        down = false;
        rail.classList.remove('is-dragging');
      };
      rail.addEventListener('pointerup', end);
      rail.addEventListener('pointercancel', end);
      rail.addEventListener('pointerleave', () => {
        if (down) end();
      });
      rail.addEventListener('dragstart', (e) => e.preventDefault());
    }
  };

  /* -------------------------------------------------------
     Flavor selector
     ------------------------------------------------------- */
  const initFlavor = () => {
    const visual = $('#flavorVisual');
    const dishes = $$('.dish');
    if (!visual || !dishes.length) return;

    const char = $('#flavorChar');
    const label = $('#flavorLabel');
    const en = $('#flavorEn');
    const note = $('.flavor__note');
    const notes = {
      fire: '一锅红汤，煮开成都人的江湖。',
      ember: '一把竹签，串起街头的热闹。',
      amber: '一挑一拌，麻辣里藏着鲜香。',
      jade: '一勺清汤，是麻辣江湖的温柔乡。',
      rose: '一点回甜，把辣也调得温柔。',
      cream: '一口酥甜，是街头的童年。'
    };

    const setActive = (dish) => {
      dishes.forEach((d) => {
        const active = d === dish;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-pressed', String(active));
      });
      const tone = dish.dataset.tone || 'fire';
      visual.dataset.tone = tone;
      if (char) char.textContent = dish.dataset.char || '';
      if (label) label.textContent = dish.dataset.label || '';
      if (en) en.textContent = dish.dataset.en || '';
      if (note) note.textContent = notes[tone] || '';
    };

    dishes.forEach((dish) => {
      dish.addEventListener('click', () => setActive(dish));
      dish.addEventListener('mouseenter', () => {
        if (finePointer) setActive(dish);
      });
      dish.addEventListener('focus', () => setActive(dish));
    });
  };

  /* -------------------------------------------------------
     Journey tabs
     ------------------------------------------------------- */
  const initTabs = () => {
    const tabs = $$('.tab');
    if (!tabs.length) return;
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

    const activate = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (panels[i]) {
          panels[i].hidden = !active;
          panels[i].classList.toggle('is-active', active);
        }
      });
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(i));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          activate((i + 1) % tabs.length, true);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          activate((i - 1 + tabs.length) % tabs.length, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          activate(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          activate(tabs.length - 1, true);
        }
      });
    });
  };

  /* -------------------------------------------------------
     Dialect flip cards
     ------------------------------------------------------- */
  const initWords = () => {
    $$('.word').forEach((word) => {
      word.addEventListener('click', () => {
        const next = !word.classList.contains('is-flipped');
        word.classList.toggle('is-flipped', next);
        word.setAttribute('aria-pressed', String(next));
      });
    });
  };

  /* -------------------------------------------------------
     Parallax
     ------------------------------------------------------- */
  const initParallax = () => {
    const items = $$('[data-parallax]');
    if (!items.length || prefersReduced) return;
    let ticking = false;

    const update = () => {
      const vh = window.innerHeight;
      items.forEach((item) => {
        const speed = parseFloat(item.dataset.parallax) || 0.1;
        const rect = item.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) return;
        const offset = clamp((rect.top + rect.height / 2 - vh / 2) * speed, -90, 90);
        item.style.transform = `translate3d(0, ${(-offset).toFixed(2)}px, 0)`;
      });
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  };

  /* -------------------------------------------------------
     Hero pointer parallax + dust canvas
     ------------------------------------------------------- */
  const initHeroMotion = () => {
    const hero = $('.hero');
    const canvas = $('#heroCanvas');
    if (!hero || prefersReduced) return;

    if (finePointer) {
      const title = $('.hero__title');
      const side = $('.hero__side');
      let raf = null;
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;

      const apply = () => {
        if (title) title.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
        if (side) side.style.transform = `translate3d(${(-cx * 0.6).toFixed(2)}px, ${(-cy * 0.6).toFixed(2)}px, 0)`;
        raf = null;
      };
      const loop = () => {
        cx = lerp(cx, tx, 0.08);
        cy = lerp(cy, ty, 0.08);
        apply();
        if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
          raf = requestAnimationFrame(loop);
        }
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 11;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 8;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      hero.addEventListener('pointerleave', () => {
        tx = 0;
        ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      apply();
    }

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles = [];
    let raf = null;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const amount = w < 700 ? 26 : 46;
      particles = Array.from({ length: amount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.7 + 0.4,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.22 + 0.04),
        a: Math.random() * 0.35 + 0.12,
        warm: Math.random() > 0.78
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.warm
          ? `rgba(216, 154, 104, ${p.a})`
          : `rgba(236, 226, 202, ${p.a})`;
        ctx.fill();
      });
      if (visible) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !raf) draw();
          if (!visible && raf) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        },
        { threshold: 0 }
      );
      obs.observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!document.hidden && !raf && visible) {
        draw();
      }
    });
  };

  /* -------------------------------------------------------
     Magnetic buttons + card tilt
     ------------------------------------------------------- */
  const initPointerPolish = () => {
    if (!finePointer || prefersReduced) return;

    $$('.magnetic').forEach((el) => {
      const strength = 7;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
      });
    });

    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 3.4).toFixed(2)}deg) rotateY(${(px * 3.4).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  };

  /* -------------------------------------------------------
     Custom cursor
     ------------------------------------------------------- */
  const initCursor = () => {
    if (!finePointer || prefersReduced) return;
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let started = false;

    const render = () => {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot.style.opacity !== '1') {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      if (!started) {
        started = true;
        rx = mx;
        ry = my;
        document.documentElement.classList.add('cursor-ready');
        render();
      }
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('a, button, [data-cursor]');
      ring.classList.toggle('is-hover', Boolean(target));
    });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('pointerenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });
  };

  /* -------------------------------------------------------
     Footer year / boot
     ------------------------------------------------------- */
  const boot = () => {
    initLoader();
    initHeader();
    initMenu();
    initAnchors();
    initReveal();
    initCounters();
    initCinema();
    initMusic();
    initRail();
    initFlavor();
    initTabs();
    initWords();
    initParallax();
    initHeroMotion();
    initPointerPolish();
    initCursor();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
