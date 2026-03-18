/* ═══════════════════════════════════════════════════════════════════
   CEÒLMHOR — MAIN.JS
   Shared across every page. No frameworks. Pure vanilla JS.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Navigation: glassmorphism on scroll ───────────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const handleScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Run once on load
  }

  /* ── 2. Hamburger / Mobile Overlay ───────────────────────────── */
  const hamburger = document.querySelector('.nav__hamburger');
  const overlay   = document.querySelector('.nav__overlay');

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close when an overlay link is tapped
    overlay.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── 3. Scroll Reveal (IntersectionObserver) ─────────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      // Fallback for browsers without IntersectionObserver
      revealEls.forEach(function (el) { el.classList.add('revealed'); });
    }
  }

  /* ── 4. Hero Stagger Animation (index.html only) ─────────────── */
  const heroStaggerEls = document.querySelectorAll('[data-hero-stagger]');
  heroStaggerEls.forEach(function (el, i) {
    el.style.animationDelay = (0.1 + i * 0.15) + 's';
  });

  /* ── 5. FAQ Accordion ────────────────────────────────────────── */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-item__q');
    if (!question) return;

    question.addEventListener('click', function () {
      const wasOpen = item.classList.contains('open');
      // Close all
      faqItems.forEach(function (i) { i.classList.remove('open'); });
      // Re-open if it wasn't open
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ── 6. Contact Form: conditional Event Date field ───────────── */
  const enquiryHidden = document.getElementById('enquiry-type-hidden');
  const dateGroup     = document.getElementById('event-date-group');

  const EVENT_TYPES = [
    'wedding',
    'funeral',
    'burns',
    'corporate',
    'festival',
    'graduation',
    'custom'
  ];

  if (enquiryHidden && dateGroup) {
    function toggleDateField() {
      const isEvent = EVENT_TYPES.indexOf(enquiryHidden.value) !== -1;
      dateGroup.classList.toggle('hidden', !isEvent);
    }
    enquiryHidden.addEventListener('change', toggleDateField);
    toggleDateField(); // Set initial state
  }

  /* ── 7. Contact Form: Worker submission ──────────────────────── */
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    var turnstileToken = null;
    var submitting     = false;
    var submitBtn      = document.getElementById('submit-btn');
    var formError      = document.getElementById('form-error');
    var formSuccess    = document.getElementById('form-success');

    window.onTurnstileSuccess = function (token) {
      turnstileToken = token;
      updateSubmitState();
    };

    function updateSubmitState() {
      var firstName   = document.getElementById('first-name').value.trim();
      var lastName    = document.getElementById('last-name').value.trim();
      var email       = document.getElementById('email').value.trim();
      var primaryType = document.getElementById('enquiry-primary-hidden').value;
      var message     = document.getElementById('message').value.trim();
      var canSubmit   = firstName && lastName && email && primaryType && message && turnstileToken && !submitting;

      if (submitBtn) {
        submitBtn.disabled      = !canSubmit;
        submitBtn.style.opacity = canSubmit ? '1' : '0.5';
      }
    }

    ['first-name', 'last-name', 'email', 'message'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateSubmitState);
    });

    var primaryHiddenEl = document.getElementById('enquiry-primary-hidden');
    if (primaryHiddenEl) primaryHiddenEl.addEventListener('change', updateSubmitState);

    updateSubmitState();

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;

      submitting = true;
      if (submitBtn) submitBtn.textContent = 'Sending...';
      if (formError) formError.style.display = 'none';
      updateSubmitState();

      var firstName   = document.getElementById('first-name').value.trim();
      var lastName    = document.getElementById('last-name').value.trim();
      var email       = document.getElementById('email').value.trim();
      var primaryType = document.getElementById('enquiry-primary-hidden').value;
      var subType     = document.getElementById('enquiry-type-hidden').value;
      var dayEl       = document.getElementById('event-day');
      var monthEl     = document.getElementById('event-month');
      var yearEl      = document.getElementById('event-year');
      var day         = dayEl   ? dayEl.value   : '';
      var month       = monthEl ? monthEl.value : '';
      var year        = yearEl  ? yearEl.value  : '';
      var childCheck  = document.getElementById('child-enquiry-check');
      var message     = document.getElementById('message').value.trim();

      var payload = {
        firstName:      firstName,
        lastName:       lastName,
        email:          email,
        primaryType:    primaryType,
        subType:        subType,
        eventDate:      day && month && year ? day + '/' + month + '/' + year : '',
        isChildEnquiry: childCheck ? childCheck.checked : false,
        message:        message,
        turnstileToken: turnstileToken,
      };

      fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            var successEmailEl = document.getElementById('form-success-email');
            if (successEmailEl) successEmailEl.textContent = email;
            if (formSuccess) formSuccess.classList.add('visible');
            contactForm.style.display = 'none';
          } else {
            if (formError) {
              formError.querySelector('p').textContent = result.error || 'Something went wrong. Please try again.';
              formError.style.display = 'block';
            }
          }
        })
        .catch(function () {
          if (formError) {
            formError.querySelector('p').textContent = 'Unable to send your enquiry. Please try again or email contact@ceolmhor.scot directly.';
            formError.style.display = 'block';
          }
        })
        .finally(function () {
          submitting = false;
          if (submitBtn) submitBtn.textContent = 'Send Enquiry';
          updateSubmitState();
        });
    });
  }

  /* ── 8. Smooth scroll — same-page anchors only ───────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      var target   = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── 9. Particle Background ──────────────────────────────────── */
  if (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    typeof tsParticles !== 'undefined'
  ) {
    tsParticles.load('tsparticles', {
      fpsLimit: 60,
      background: {
        gradient: {
          type: 'linear',
          stops: [
            { value: 0, color: { value: '#3a3a3a' } },
            { value: 100, color: { value: '#000000' } }
          ]
        }
      },
      particles: {
        number: { value: 110, density: { enable: true, area: 900 } },
        color: { value: ['#c9a84c', '#c9a84c', '#c9a84c', '#b8943e'] },
        opacity: { value: { min: 0.4, max: 0.6 } },
        size: { value: { min: 1.5, max: 3 } },
        move: {
          enable: true,
          direction: 'top',
          speed: { min: 0.25, max: 0.55 },
          random: true,
          straight: false,
          outModes: { default: 'out' }
        },
        links: { enable: false }
      },
      interactivity: {
        events: { onClick: { enable: false }, onHover: { enable: false } }
      },
      detectRetina: true
    });
  }

  /* ── 10. Particle speed — scroll velocity with inertia ───────────── */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var lastScrollY    = window.scrollY;
    var lastScrollTime = performance.now();
    var targetFactor   = 1.0;
    var currentFactor  = 1.0;
    var lastApplied    = 1.0;
    var MAX_FACTOR     = 7.0;
    var INERTIA        = 0.92; // how long the tail lasts

    window.addEventListener('scroll', function () {
      var now    = performance.now();
      var deltaY = Math.abs(window.scrollY - lastScrollY);
      var deltaT = Math.max(now - lastScrollTime, 1);
      var vel    = deltaY / deltaT; // px per ms
      targetFactor   = Math.min(1.0 + vel * 20, MAX_FACTOR);
      lastScrollY    = window.scrollY;
      lastScrollTime = now;
    }, { passive: true });

    function tickParticleSpeed() {
      // Decay target back toward 1.0 each frame
      if (targetFactor > 1.0) { targetFactor *= INERTIA; }
      if (targetFactor < 1.0)   targetFactor = 1.0;

      // Smooth blend of current toward target
      currentFactor = currentFactor * 0.85 + targetFactor * 0.15;

      var delta = currentFactor / lastApplied;
      if (Math.abs(delta - 1.0) > 0.005 && window.tsParticles) {
        var container = window.tsParticles.domItem(0);
        if (container && container.particles && container.particles.array) {
          container.particles.array.forEach(function (p) {
            if (p.velocity) {
              p.velocity.x *= delta;
              p.velocity.y *= delta;
            }
          });
          lastApplied = currentFactor;
        }
      }
      requestAnimationFrame(tickParticleSpeed);
    }
    requestAnimationFrame(tickParticleSpeed);
  }

})();
