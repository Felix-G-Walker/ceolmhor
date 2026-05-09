/* ═══════════════════════════════════════════════════════════════════
   CEÒLMHOR — LANG.JS
   Language toggle: English ↔ Gàidhlig
   Persists via localStorage('ceolmhor-lang').
   Elements with data-gd="…"      → textContent swap
   Elements with data-gd-html="…" → innerHTML swap (decoded from HTML entities)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LANG_KEY = 'ceolmhor-lang';

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'en';
  }

  function applyLang(lang) {
    var isGd = lang === 'gd';

    document.documentElement.lang = isGd ? 'gd' : 'en-GB';

    /* Text content */
    document.querySelectorAll('[data-gd]').forEach(function (el) {
      if (!el.dataset.en) el.dataset.en = el.textContent.trim();
      el.textContent = isGd ? el.dataset.gd : el.dataset.en;
    });

    /* Inner HTML (paragraphs with inline markup) */
    document.querySelectorAll('[data-gd-html]').forEach(function (el) {
      if (!el.dataset.enHtml) el.dataset.enHtml = el.innerHTML;
      el.innerHTML = isGd ? el.dataset.gdHtml : el.dataset.enHtml;
    });

    /* Placeholder attributes */
    document.querySelectorAll('[data-gd-placeholder]').forEach(function (el) {
      if (!el.dataset.enPlaceholder) el.dataset.enPlaceholder = el.placeholder;
      el.placeholder = isGd ? el.dataset.gdPlaceholder : el.dataset.enPlaceholder;
    });

    /* Photo caption attributes (rendered via CSS content: attr(data-caption)) */
    document.querySelectorAll('[data-caption-gd]').forEach(function (el) {
      if (!el.dataset.captionEn) el.dataset.captionEn = el.dataset.caption;
      el.dataset.caption = isGd ? el.dataset.captionGd : el.dataset.captionEn;
    });

    /* Sync all toggle pills on this page */
    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      btn.classList.toggle('gd-active', isGd);
      btn.setAttribute('aria-checked', isGd ? 'true' : 'false');
    });

    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.classList.remove('lang-gd');
  }

  function init() {
    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.classList.contains('gd-active') ? 'en' : 'gd');
      });
    });
    applyLang(getLang());
    document.documentElement.classList.add('page-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
