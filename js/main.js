(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Mobile menu ---
    var menuBtn = document.getElementById('menuBtn');
    var navLinks = document.getElementById('navLinks');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function () {
            var open = navLinks.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    // --- FAQ accordion ---
    document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item = btn.parentElement;
            var answer = item.querySelector('.faq-answer');
            var isOpen = item.classList.contains('open');

            document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
                openItem.classList.remove('open');
                var openBtn = openItem.querySelector('.faq-question');
                if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
                openItem.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    // --- Smooth scroll + close menu on nav click ---
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function () {
            if (navLinks) {
                navLinks.classList.remove('open');
                if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // --- Carousel ---
    var track = document.getElementById('carouselTrack');
    if (!track) return;

    var dotsContainer = document.getElementById('carouselDots');
    var viewport = document.getElementById('carouselViewport');

    // Support both pre-wrapped slides and legacy bare <img> markup.
    var origSlides = Array.prototype.slice.call(track.children).filter(function (node) {
        return node.classList && node.classList.contains('carousel-slide');
    });

    if (!origSlides.length) {
        var origImages = Array.prototype.slice.call(track.querySelectorAll('.screenshot'));
        if (!origImages.length) return;

        origImages.forEach(function (img) {
            var slide = document.createElement('div');
            slide.className = 'carousel-slide';
            img.parentNode.insertBefore(slide, img);
            slide.appendChild(img);
        });

        origSlides = Array.prototype.slice.call(track.querySelectorAll('.carousel-slide'));
    }

    var count = origSlides.length;
    if (!count) return;

    // Clones for infinite loop
    var lastClone = origSlides[count - 1].cloneNode(true);
    var firstClone = origSlides[0].cloneNode(true);
    lastClone.setAttribute('aria-hidden', 'true');
    firstClone.setAttribute('aria-hidden', 'true');
    track.insertBefore(lastClone, origSlides[0]);
    track.appendChild(firstClone);

    var allSlides = Array.prototype.slice.call(track.querySelectorAll('.carousel-slide'));
    var current = 0;
    var autoInterval = null;
    var transitioning = false;
    var transitionTimer = null;
    var slideWidthPercent = readSlideWidth();

    function readSlideWidth() {
        // Use layout width so transforms like scale() do not skew the step size.
        if (!viewport || !allSlides.length) return 60;
        var vw = viewport.clientWidth;
        if (!vw) return 60;
        var sw = allSlides[1].offsetWidth; // skip clone
        return (sw / vw) * 100;
    }

    function getOffset(index) {
        var domIndex = index + 1; // +1 because of prepended clone
        return -(domIndex * slideWidthPercent) + (50 - slideWidthPercent / 2);
    }

    function updateActiveClass(index) {
        var domIndex = index + 1;
        allSlides.forEach(function (s, i) {
            s.classList.toggle('active', i === domIndex);
        });
    }

    function jumpTo(index) {
        track.style.transition = 'none';
        track.style.transform = 'translateX(' + getOffset(index) + '%)';
        updateActiveClass(index);
        // Force reflow so the next transition runs.
        // eslint-disable-next-line no-unused-expressions
        track.offsetHeight;
    }

    function endTransition() {
        transitioning = false;
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        if (current < 0) {
            current = count - 1;
            jumpTo(current);
        } else if (current >= count) {
            current = 0;
            jumpTo(current);
        }
        updateDots();
    }

    function slideTo(index) {
        if (transitioning) return;
        transitioning = true;
        if (prefersReducedMotion) {
            current = index;
            jumpTo(((index % count) + count) % count);
            transitioning = false;
            updateDots();
            return;
        }
        track.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.1, 0.25, 1)';
        track.style.transform = 'translateX(' + getOffset(index) + '%)';
        current = index;
        updateActiveClass(index);
        updateDots();
        // Failsafe: if transitionend never fires (e.g. interrupted), unlock.
        transitionTimer = setTimeout(endTransition, 700);
    }

    track.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'transform') return;
        endTransition();
    });

    // Dots
    if (dotsContainer) {
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Скриншот ' + (i + 1));
            (function (idx) {
                dot.addEventListener('click', function () {
                    resetAuto();
                    slideTo(idx);
                });
            })(i);
            dotsContainer.appendChild(dot);
        }
    }
    var dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel-dot') : [];

    function updateDots() {
        var real = ((current % count) + count) % count;
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === real);
        });
    }

    function clearAuto() {
        if (!autoInterval) return;
        clearInterval(autoInterval);
        autoInterval = null;
    }

    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');
    if (prevBtn) prevBtn.addEventListener('click', function () { resetAuto(); slideTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { resetAuto(); slideTo(current + 1); });

    // Pointer events: unifies mouse/touch/pen
    var startX = 0, startY = 0, isDragging = false, isHorizontal = null, activePointerId = null;

    track.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        isHorizontal = null;
        activePointerId = e.pointerId;
        if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', function (e) {
        if (!isDragging || e.pointerId !== activePointerId) return;
        if (isHorizontal === null) {
            var dx = Math.abs(e.clientX - startX);
            var dy = Math.abs(e.clientY - startY);
            if (dx > 5 || dy > 5) isHorizontal = dx > dy;
        }
        if (isHorizontal && e.cancelable) e.preventDefault();
    });

    function endPointer(e) {
        if (!isDragging || e.pointerId !== activePointerId) return;
        var diff = e.clientX - startX;
        var wasHorizontal = isHorizontal;
        isDragging = false;
        isHorizontal = null;
        if (track.releasePointerCapture && track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) {
            track.releasePointerCapture(e.pointerId);
        }
        activePointerId = null;
        if (wasHorizontal && Math.abs(diff) > 40) {
            resetAuto();
            slideTo(current + (diff < 0 ? 1 : -1));
        }
    }
    track.addEventListener('pointerup', endPointer);
    track.addEventListener('pointercancel', endPointer);

    // Auto-scroll (skipped under reduced motion)
    function startAuto() {
        if (prefersReducedMotion || document.hidden || autoInterval) return;
        autoInterval = setInterval(function () { slideTo(current + 1); }, 4000);
    }
    function resetAuto() {
        clearAuto();
        startAuto();
    }

    var wrap = document.querySelector('.carousel-wrap');
    if (wrap) {
        wrap.addEventListener('mouseenter', clearAuto);
        wrap.addEventListener('mouseleave', startAuto);
    }

    // Pause when tab hidden
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            clearAuto();
        } else {
            startAuto();
        }
    });

    // Throttled resize: recompute slide width and recenter.
    var resizeRaf = null;
    window.addEventListener('resize', function () {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(function () {
            resizeRaf = null;
            var newWidth = readSlideWidth();
            if (Math.abs(newWidth - slideWidthPercent) > 0.5) {
                slideWidthPercent = newWidth;
                jumpTo(((current % count) + count) % count);
            }
        });
    });

    // Init
    jumpTo(0);
    startAuto();

    // --- Copy server IP ---
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                if (!document.execCommand('copy')) {
                    document.body.removeChild(ta);
                    reject(new Error('copy failed'));
                    return;
                }
                document.body.removeChild(ta);
                resolve();
            } catch (e) { reject(e); }
        });
    }

    var copyResetTimers = new WeakMap();
    document.querySelectorAll('.server-address[data-copy]').forEach(function (btn) {
        var hint = btn.querySelector('.server-address-hint');
        var defaultHint = hint ? hint.textContent : '';
        if (hint) {
            hint.setAttribute('aria-live', 'polite');
            hint.setAttribute('aria-atomic', 'true');
        }
        btn.addEventListener('click', function () {
            var ip = btn.getAttribute('data-copy');
            copyText(ip).then(function () {
                var prevTimer = copyResetTimers.get(btn);
                if (prevTimer) clearTimeout(prevTimer);
                btn.classList.add('copied');
                if (hint) hint.textContent = 'скопировано';
                copyResetTimers.set(btn, setTimeout(function () {
                    btn.classList.remove('copied');
                    if (hint) hint.textContent = defaultHint;
                    copyResetTimers.delete(btn);
                }, 1400));
            }).catch(function () {
                btn.classList.remove('copied');
                if (!hint) return;
                var prevTimer = copyResetTimers.get(btn);
                if (prevTimer) clearTimeout(prevTimer);
                hint.textContent = 'не удалось скопировать';
                copyResetTimers.set(btn, setTimeout(function () {
                    hint.textContent = defaultHint;
                    copyResetTimers.delete(btn);
                }, 1800));
            });
        });
    });

    // --- MOTD renderer ---
    var MOTD_COLORS = {
        '0':'#000000','1':'#0000AA','2':'#00AA00','3':'#00AAAA',
        '4':'#AA0000','5':'#AA00AA','6':'#FFAA00','7':'#AAAAAA',
        '8':'#555555','9':'#5555FF','a':'#55FF55','b':'#55FFFF',
        'c':'#FF5555','d':'#FF55FF','e':'#FFFF55','f':'#FFFFFF'
    };
    var OBFUSCATE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+=<>?/\\|';

    function motdDefaultState() {
        return { color: '#FFFFFF', bold: false, italic: false, under: false, strike: false, obf: false };
    }

    function motdEscape(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function motdStyle(s) {
        var st = ['color:' + s.color];
        if (s.bold) st.push('font-weight:700');
        if (s.italic) st.push('font-style:italic');
        var d = [];
        if (s.under) d.push('underline');
        if (s.strike) d.push('line-through');
        if (d.length) st.push('text-decoration:' + d.join(' '));
        return st.join(';');
    }

    function renderMotd(text) {
        var out = '';
        var cur = motdDefaultState();
        var buf = '';
        var flush = function () {
            if (!buf) return;
            var cls = cur.obf ? ' class="motd-k"' : '';
            out += '<span style="' + motdStyle(cur) + '"' + cls + '>' + motdEscape(buf) + '</span>';
            buf = '';
        };
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (ch === '§' && i + 1 < text.length) {
                flush();
                var code = text.charAt(i + 1).toLowerCase();
                i++;
                if (MOTD_COLORS[code]) {
                    cur = motdDefaultState();
                    cur.color = MOTD_COLORS[code];
                } else if (code === 'l') cur.bold = true;
                else if (code === 'o') cur.italic = true;
                else if (code === 'n') cur.under = true;
                else if (code === 'm') cur.strike = true;
                else if (code === 'k') cur.obf = true;
                else if (code === 'r') cur = motdDefaultState();
            } else if (ch === '\n') {
                flush();
                out += '<br>';
            } else {
                buf += ch;
            }
        }
        flush();
        return out;
    }

    var obfuscated = [];
    document.querySelectorAll('.server-motd[data-motd]').forEach(function (el) {
        var raw = el.getAttribute('data-motd');
        if (!raw) return;
        el.innerHTML = renderMotd(raw);
        el.querySelectorAll('.motd-k').forEach(function (span) {
            obfuscated.push({
                el: span,
                len: span.textContent.length
            });
        });
    });

    function randomObfuscatedText(length) {
        var s = '';
        for (var i = 0; i < length; i++) {
            s += OBFUSCATE_CHARS.charAt(Math.floor(Math.random() * OBFUSCATE_CHARS.length));
        }
        return s;
    }

    function updateObfuscatedText() {
        obfuscated.forEach(function (item) {
            item.el.textContent = randomObfuscatedText(item.len);
        });
    }

    var obfuscationTimer = null;
    var obfuscationSectionVisible = true;

    function shouldAnimateObfuscation() {
        return obfuscated.length && !prefersReducedMotion && !document.hidden && obfuscationSectionVisible;
    }

    function stopObfuscation() {
        if (!obfuscationTimer) return;
        clearTimeout(obfuscationTimer);
        obfuscationTimer = null;
    }

    function scheduleObfuscation() {
        if (obfuscationTimer || !shouldAnimateObfuscation()) return;
        obfuscationTimer = setTimeout(function tickObfuscation() {
            obfuscationTimer = null;
            if (!shouldAnimateObfuscation()) return;
            updateObfuscatedText();
            scheduleObfuscation();
        }, 80);
    }

    if (obfuscated.length && !prefersReducedMotion) {
        var serversSection = document.querySelector('.servers-section');
        if (serversSection && 'IntersectionObserver' in window) {
            obfuscationSectionVisible = false;
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.target !== serversSection) return;
                    obfuscationSectionVisible = entry.isIntersecting;
                });
                if (shouldAnimateObfuscation()) scheduleObfuscation();
                else stopObfuscation();
            }, {
                threshold: 0.05
            }).observe(serversSection);
        }

        document.addEventListener('visibilitychange', function () {
            if (shouldAnimateObfuscation()) scheduleObfuscation();
            else stopObfuscation();
        });

        requestAnimationFrame(function () {
            if (shouldAnimateObfuscation()) {
                updateObfuscatedText();
                scheduleObfuscation();
            }
        });
    }
})();
