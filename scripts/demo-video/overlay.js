// Injected into every page: fake cursor, caption bar, full-bleed cards, smooth scroll.
window.__d = (function () {
  const ns = {};
  let root, cursor, caption, capMain, capSub, card, badge;

  function el(tag, css, html) {
    const e = document.createElement(tag);
    e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  ns.install = function () {
    const stale = document.getElementById('__d_root');
    if (stale) stale.remove();
    root = el('div', 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;');
    root.id = '__d_root';

    cursor = el('div', [
      'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;',
      'border-radius:50%;background:rgba(255,255,255,.92);',
      'box-shadow:0 0 0 4px rgba(255,255,255,.22), 0 6px 18px rgba(0,0,0,.55);',
      'transform:translate3d(-100px,-100px,0);transition:transform .05s linear;opacity:0;'
    ].join(''));

    caption = el('div', [
      'position:fixed;left:50%;bottom:44px;transform:translateX(-50%) translateY(14px);',
      'max-width:1000px;width:calc(100% - 120px);box-sizing:border-box;',
      'padding:18px 26px;border-radius:16px;',
      'background:rgba(9,9,11,.86);border:1px solid rgba(255,255,255,.10);',
      'backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.6);',
      'opacity:0;transition:opacity .45s ease, transform .45s ease;text-align:center;'
    ].join(''));
    capMain = el('div', 'font-family:var(--font-newsreader),Georgia,serif;font-size:27px;line-height:1.32;color:#fafafa;letter-spacing:-.01em;');
    capSub = el('div', 'margin-top:7px;font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#8b8b94;');
    caption.appendChild(capMain); caption.appendChild(capSub);

    card = el('div', [
      'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'background:#09090b;opacity:0;transition:opacity .7s ease;text-align:center;padding:0 90px;'
    ].join(''));

    badge = el('div', [
      'position:fixed;right:26px;top:22px;padding:7px 13px;border-radius:999px;',
      'background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);color:#34d399;',
      'font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:11.5px;letter-spacing:.10em;',
      'opacity:0;transition:opacity .4s ease;'
    ].join(''), '');

    root.appendChild(card); root.appendChild(caption); root.appendChild(badge); root.appendChild(cursor);
    document.body.appendChild(root);

    document.addEventListener('mousemove', (e) => {
      cursor.style.opacity = '1';
      cursor.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    }, true);
    document.addEventListener('mousedown', (e) => {
      const r = el('div', [
        `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:16px;height:16px;margin:-8px 0 0 -8px;`,
        'border-radius:50%;border:2px solid rgba(255,255,255,.9);',
        'transform:scale(.4);opacity:1;transition:transform .5s ease-out, opacity .5s ease-out;'
      ].join(''));
      root.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(3.6)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };

  ns.caption = function (main, sub) {
    capMain.innerHTML = main || '';
    capSub.innerHTML = sub || '';
    caption.style.opacity = '1';
    caption.style.transform = 'translateX(-50%) translateY(0)';
  };
  ns.hideCaption = function () {
    caption.style.opacity = '0';
    caption.style.transform = 'translateX(-50%) translateY(14px)';
  };
  ns.captionPos = function (where) {
    if (where === 'top') {
      caption.style.bottom = 'auto';
      caption.style.top = '38px';
    } else {
      caption.style.top = 'auto';
      caption.style.bottom = '44px';
    }
  };

  ns.rectOf = function (sel) {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height, scrollY: window.scrollY };
  };

  ns.badge = function (text) {
    badge.innerHTML = text || '';
    badge.style.opacity = text ? '1' : '0';
  };
  ns.showCard = function (html) {
    card.innerHTML = html;
    card.style.opacity = '1';
  };
  ns.hideCard = function () { card.style.opacity = '0'; };

  ns.scrollTo = function (y, dur) {
    return new Promise((res) => {
      const start = window.scrollY, delta = y - start, t0 = performance.now();
      function step(t) {
        const k = Math.min(1, (t - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        window.scrollTo(0, start + delta * e);
        if (k < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  };

  ns.scrollToText = function (text, dur, offset) {
    const nodes = [...document.querySelectorAll('h1,h2,h3,p,div,span,label')];
    const hit = nodes.find((n) => n.textContent && n.textContent.trim().startsWith(text));
    if (!hit) return Promise.resolve(false);
    const y = hit.getBoundingClientRect().top + window.scrollY - (offset == null ? 120 : offset);
    return ns.scrollTo(Math.max(0, y), dur || 1600).then(() => true);
  };

  return ns;
})();
