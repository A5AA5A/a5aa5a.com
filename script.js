(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.querySelector('#mobile-nav');
  const dialog = document.querySelector('#contact-dialog');
  const form = document.querySelector('#contact-form');
  const formView = dialog?.querySelector('[data-form-view]');
  const thanksView = dialog?.querySelector('[data-thanks-view]');
  const formStatus = dialog?.querySelector('.form-status');

  const setMenuOpen = (open) => {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    if (open) mobileNav.removeAttribute('hidden');
    else mobileNav.setAttribute('hidden', '');
  };

  const closeMenu = () => setMenuOpen(false);

  // 戻る・再描画後もDOMの状態を必ず初期化し、何度でも開閉できるようにする。
  closeMenu();

  menuButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  const scrollToSection = (link) => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    closeMenu();
    const header = document.querySelector('.site-header');
    const offset = header?.getBoundingClientRect().height || 0;
    const top = window.scrollY + target.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    window.history.replaceState(null, '', href);
  };

  document.querySelectorAll('[data-section-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToSection(link);
    });
  });

  // グローバルナビゲーション：現在見ているセクションを控えめに表示
  const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
  const sectionIds = [...new Set(sectionLinks.map((link) => link.getAttribute('href')).filter((href) => href?.startsWith('#')))];
  const trackedSections = sectionIds
    .map((href) => document.querySelector(href))
    .filter(Boolean);

  const setCurrentSection = (id) => {
    sectionLinks.forEach((link) => {
      const current = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  if ('IntersectionObserver' in window && trackedSections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setCurrentSection(visible.target.id);
    }, { rootMargin: '-18% 0px -58% 0px', threshold: [0.05, 0.2, 0.45] });
    trackedSections.forEach((section) => observer.observe(section));
  }

  const tips = [...document.querySelectorAll('.secret-tip')];
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const tipTimers = new WeakMap();

  const clearTipTimer = (tip) => {
    const timer = tipTimers.get(tip);
    if (timer) window.clearTimeout(timer);
    tipTimers.delete(tip);
  };

  const closeTip = (tip, softly = false) => {
    clearTipTimer(tip);
    const button = tip.querySelector('.tip-chip');
    if (softly && tip.classList.contains('is-open')) {
      tip.classList.add('is-fading');
      const timer = window.setTimeout(() => {
        tip.classList.remove('is-open', 'is-fading');
        button?.setAttribute('aria-expanded', 'false');
        tipTimers.delete(tip);
      }, 900);
      tipTimers.set(tip, timer);
      return;
    }
    tip.classList.remove('is-open', 'is-fading');
    button?.setAttribute('aria-expanded', 'false');
  };

  const showTimedTip = (tip) => {
    tips.forEach((other) => {
      if (other !== tip) closeTip(other);
    });
    clearTipTimer(tip);
    tip.classList.remove('is-fading');
    tip.classList.add('is-open');
    tip.querySelector('.tip-chip')?.setAttribute('aria-expanded', 'true');

    const characterCount = tip.querySelector('.tip-popover')?.textContent?.replace(/\s/g, '').length || 0;
    const readingTime = Math.min(11000, Math.max(6200, characterCount * 130 + 2600));
    tipTimers.set(tip, window.setTimeout(() => closeTip(tip, true), readingTime));
  };

  tips.forEach((tip) => {
    const button = tip.querySelector('.tip-chip');
    button?.addEventListener('click', (event) => {
      if (finePointer.matches) return;
      event.preventDefault();
      event.stopPropagation();
      showTimedTip(tip);
    });
  });

  finePointer.addEventListener?.('change', () => {
    tips.forEach((tip) => closeTip(tip));
  });

  const resetContactDialog = () => {
    if (!formView || !thanksView) return;
    formView.hidden = false;
    thanksView.hidden = true;
    if (formStatus) formStatus.textContent = '';
  };

  document.querySelectorAll('[data-open-contact]').forEach((button) => {
    button.addEventListener('click', () => {
      closeMenu();
      resetContactDialog();
      if (!dialog) return;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });

  document.querySelectorAll('[data-close-contact]').forEach((button) => {
    button.addEventListener('click', () => dialog?.close());
  });

  dialog?.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  const showThankYou = () => {
    if (!formView || !thanksView) return;
    formView.hidden = true;
    thanksView.hidden = false;
    thanksView.focus?.();
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submitButton = form.querySelector('.form-submit');
    const endpoint = form.dataset.endpoint?.trim();
    submitButton.disabled = true;
    submitButton.textContent = '送信中…';
    if (formStatus) formStatus.textContent = '';

    try {
      if (!endpoint) {
        // 送信先未設定時だけ、ローカル確認用の完了表示を行います。
        await new Promise((resolve) => setTimeout(resolve, 650));
        showThankYou();
        form.reset();
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });

      if (!response.ok) throw new Error('form-submit-failed');

      // FormSubmit のAJAXレスポンスに success:false が含まれる場合は完了扱いにしない。
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await response.json();
        if (result && result.success === false) throw new Error('form-submit-failed');
      }

      showThankYou();
      form.reset();
    } catch (error) {
      if (formStatus) formStatus.textContent = '送信できませんでした。時間をおいて、もう一度お試しください。';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '送信する';
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeMenu();
    tips.forEach((tip) => {
      tip.classList.remove('is-open');
      tip.querySelector('.tip-chip')?.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });
})();
