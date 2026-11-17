(function () {
    var LOGO = '<a href="./" class="logo" aria-label="PingMeter home"><svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0B0F19"/><path d="M8 36h12l6-16 10 24 6-12h14" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>Ping<span>Meter</span></a>';

    var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (path === '') path = '/';

    var pages = [
        { href: './', label: 'Test', match: '/' },
        { href: 'good-speed', label: 'Good Speed', match: '/good-speed' },
        { href: 'glossary', label: 'Glossary', match: '/glossary' },
        { href: 'faq', label: 'FAQ', match: '/faq' },
        { href: 'about', label: 'About', match: '/about' }
    ];

    function isActive(m) {
        if (m === '/') return path === '/';
        return path.indexOf(m) === 0;
    }

    function retrofit() {
        // --- Header (skip pages that already have the v2 header) ---
        var header = document.querySelector('.glass-header');
        if (header && !header.querySelector('.logo-mark')) {
            var nav = '<nav id="main-nav" aria-label="Main navigation">' + pages.map(function (p) {
                return '<a href="' + p.href + '"' + (isActive(p.match) ? ' class="active"' : '') + '>' + p.label + '</a>';
            }).join('') + '</nav>';
            var toggle = '<button class="menu-toggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>';
            header.innerHTML = '<div class="container header-inner">' + LOGO + nav + toggle + '</div>';
            header.querySelector('.menu-toggle').addEventListener('click', function () {
                document.getElementById('main-nav').classList.toggle('open');
            });
        }

        // --- Footer ---
        var footer = document.querySelector('.glass-footer');
        if (footer && !footer.dataset.v2) {
            footer.dataset.v2 = '1';
            footer.innerHTML = '<div class="container footer-inner"><p>&copy; 2026 PingMeter. All rights reserved.</p><div class="footer-links"><a href="about">About</a><a href="privacy-policy">Privacy</a><a href="terms">Terms</a><a href="contact">Contact</a></div></div>';
        }

        // --- Clean ad slots (remove placeholder text) ---
        document.querySelectorAll('.ad-slot').forEach(function (el) {
            el.textContent = '';
            el.setAttribute('aria-hidden', 'true');
        });

        // --- Favicon fallback ---
        if (!document.querySelector('link[rel="icon"]')) {
            var link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/svg+xml';
            link.href = 'favicon.svg';
            document.head.appendChild(link);
        }

        // --- Consent bar (inject if missing) ---
        if (!document.getElementById('consent-bar')) {
            var bar = document.createElement('div');
            bar.className = 'consent-bar';
            bar.id = 'consent-bar';
            bar.setAttribute('role', 'dialog');
            bar.setAttribute('aria-label', 'Cookie consent');
            bar.innerHTML = '<p>We use cookies (including Google AdSense cookies) to operate the site and serve ads. See our <a href="privacy-policy">Privacy Policy</a>.</p><div class="consent-actions"><button class="btn-secondary" id="consent-decline">Decline</button><button class="btn-start btn-small" id="consent-accept">Accept</button></div>';
            document.body.appendChild(bar);
        }
        bindConsent();
    }

    function bindConsent() {
        var accept = document.getElementById('consent-accept');
        var decline = document.getElementById('consent-decline');
        var bar = document.getElementById('consent-bar');
        if (!accept || accept.dataset.bound) return;
        accept.dataset.bound = '1';

        function set(value) {
            try { localStorage.setItem('pm_consent', value); } catch (e) {}
            bar.classList.remove('show');
        }
        accept.addEventListener('click', function () { set('accepted'); });
        decline.addEventListener('click', function () { set('declined'); });

        var stored = null;
        try { stored = localStorage.getItem('pm_consent'); } catch (e) {}
        if (!stored) setTimeout(function () { bar.classList.add('show'); }, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', retrofit);
    } else {
        retrofit();
    }
})();