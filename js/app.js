const App = {
    els: {},
    ARC: 565.487,
    gaugeMax: 100,
    scales: [25, 50, 100, 250, 500, 1000],
    _raf: null,
    _latestSpeed: 0,
    state: {
        running: false,
        results: { ping: null, jitter: null, download: null, upload: null }
    },

    init() {
        this.els = {
            btnStart: document.getElementById('btn-start'),
            btnShare: document.getElementById('btn-share'),
            statusText: document.getElementById('status-text'),
            speedNumber: document.getElementById('speed-number'),
            gaugeFill: document.getElementById('gauge-fill'),
            gaugeNeedle: document.getElementById('gauge-needle'),
            gaugeTicks: document.getElementById('gauge-ticks'),
            pingVal: document.getElementById('ping-val'),
            jitterVal: document.getElementById('jitter-val'),
            dlVal: document.getElementById('dl-val'),
            ulVal: document.getElementById('ul-val'),
            historyList: document.getElementById('history-list'),
            btnClearHistory: document.getElementById('btn-clear-history'),
            consentBar: document.getElementById('consent-bar')
        };

        this.els.gaugeFill.style.strokeDasharray = this.ARC;
        this.els.gaugeFill.style.strokeDashoffset = this.ARC;
        this.buildTicks();
        this.setScale(100);

        this.els.btnStart.addEventListener('click', () => this.startTest());
        this.els.btnShare.addEventListener('click', () => this.shareResult());
        this.els.btnClearHistory.addEventListener('click', () => {
            localStorage.removeItem('pingmeter_history');
            this.renderHistory();
        });

        this.initConsent();
        this.renderHistory();
    },

    // ---------- GAUGE ----------
    buildTicks() {
        const ns = 'http://www.w3.org/2000/svg';
        const fracs = [0, 0.25, 0.5, 0.75, 1];
        fracs.forEach((f, i) => {
            const a = (135 + 270 * f) * Math.PI / 180;
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', 150 + 100 * Math.cos(a));
            line.setAttribute('y1', 150 + 100 * Math.sin(a));
            line.setAttribute('x2', 150 + 108 * Math.cos(a));
            line.setAttribute('y2', 150 + 108 * Math.sin(a));
            line.setAttribute('class', 'gauge-tick');
            this.els.gaugeTicks.appendChild(line);

            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', 150 + 84 * Math.cos(a));
            text.setAttribute('y', 150 + 84 * Math.sin(a) + 4);
            text.setAttribute('class', 'gauge-tick-label');
            text.setAttribute('id', 'tick-' + i);
            text.textContent = '0';
            this.els.gaugeTicks.appendChild(text);
        });
    },

    setScale(max) {
        this.gaugeMax = max;
        const fracs = [0, 0.25, 0.5, 0.75, 1];
        fracs.forEach((f, i) => {
            const el = document.getElementById('tick-' + i);
            if (el) el.textContent = Math.round(max * f);
        });
    },

    _queueGauge(speed) {
        this._latestSpeed = speed;
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = null;
            this.paintGauge(this._latestSpeed);
        });
    },

    paintGauge(speed) {
        if (speed > this.gaugeMax * 0.92) {
            const next = this.scales.find(s => s >= speed * 1.08);
            this.setScale(next || 1000);
        }
        const p = Math.min(speed / this.gaugeMax, 1);
        this.els.gaugeFill.style.strokeDashoffset = this.ARC * (1 - p);
        this.els.gaugeNeedle.setAttribute('transform', 'rotate(' + (135 + 270 * p) + ' 150 150)');
        this.els.speedNumber.textContent = speed.toFixed(1);
    },

    // ---------- TEST FLOW ----------
    async startTest() {
        if (this.state.running) return;

        if (!navigator.onLine) {
            this._setStatus('You appear to be offline. Connect and try again.', true);
            return;
        }

        this.state.running = true;
        this.els.btnStart.disabled = true;
        this.els.btnShare.disabled = true;
        this.els.btnStart.textContent = 'TESTING...';
        this._resetMetrics();

        try {
            this._setStatus('Measuring ping & jitter…');
            this.paintGauge(0);
            const pingResult = await PingTest.run();
            this.state.results.ping = pingResult.ping;
            this.state.results.jitter = pingResult.jitter;
            this.els.pingVal.textContent = pingResult.ping;
            this.els.jitterVal.textContent = pingResult.jitter;

            this._setStatus('Testing download speed…');
            this.setScale(100);
            this.paintGauge(0);
            const downloadSpeed = await DownloadTest.run((s) => this._queueGauge(s));
            if (!(downloadSpeed > 0)) throw new Error('Download returned no data');
            this.state.results.download = downloadSpeed;
            this.els.dlVal.textContent = downloadSpeed.toFixed(1);

            this._setStatus('Testing upload speed…');
            this.paintGauge(0);
            const uploadSpeed = await UploadTest.run((s) => this._queueGauge(s));
            if (!(uploadSpeed > 0)) throw new Error('Upload returned no data');
            this.state.results.upload = uploadSpeed;
            this.els.ulVal.textContent = uploadSpeed.toFixed(1);

            this.paintGauge(downloadSpeed);
            this._setStatus('Test complete');
            this.els.statusText.classList.add('ok');
            this.els.btnShare.disabled = false;
            this.saveResult();
            this.renderHistory();
        } catch (error) {
            this._setStatus(navigator.onLine
                ? 'Test failed: server busy or unreachable. Try again shortly.'
                : 'Connection lost during test. Check Wi-Fi or data and retry.', true);
            console.error('Speed test error:', error);
        }

        this.els.btnStart.textContent = 'TEST AGAIN';
        this.els.btnStart.disabled = false;
        this.state.running = false;
    },

    _setStatus(text, isError) {
        this.els.statusText.textContent = text;
        this.els.statusText.classList.toggle('error', !!isError);
        this.els.statusText.classList.toggle('ok', false);
        if (!isError && text === 'Test complete') this.els.statusText.classList.add('ok');
    },

    _resetMetrics() {
        ['pingVal', 'jitterVal', 'dlVal', 'ulVal'].forEach(k => this.els[k].textContent = '--');
        this.els.speedNumber.textContent = '0.0';
        this.els.statusText.classList.remove('error', 'ok');
    },

    // ---------- HISTORY ----------
    saveResult() {
        const history = this.getHistory();
        history.unshift({
            date: new Date().toISOString(),
            ping: this.state.results.ping,
            jitter: this.state.results.jitter,
            download: this.state.results.download,
            upload: this.state.results.upload
        });
        try {
            localStorage.setItem('pingmeter_history', JSON.stringify(history.slice(0, 10)));
        } catch (e) {}
    },

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('pingmeter_history')) || [];
        } catch (e) {
            return [];
        }
    },

    renderHistory() {
        const list = this.getHistory().slice(0, 5);
        if (!list.length) {
            this.els.historyList.innerHTML = '<p class="history-empty">No tests yet on this device.</p>';
            return;
        }
        this.els.historyList.innerHTML = list.map(h => {
            const d = new Date(h.date);
            const dateStr = isNaN(d) ? '—' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dl = Number(h.download) || 0;
            const ul = Number(h.upload) || 0;
            const pg = Number(h.ping) || 0;
            return '<div class="history-row"><span class="h-date">' + dateStr + '</span>' +
                '<span class="h-val h-dl">↓ ' + dl.toFixed(1) + '</span>' +
                '<span class="h-val h-ul">↑ ' + ul.toFixed(1) + '</span>' +
                '<span class="h-val h-ping">' + pg + ' ms</span></div>';
        }).join('');
    },

    // ---------- SHARE ----------
    async shareResult() {
        const r = this.state.results;
        const text = 'My internet speed (PingMeter): ↓ ' + r.download + ' Mbps · ↑ ' + r.upload + ' Mbps · Ping ' + r.ping + ' ms · Jitter ' + r.jitter + ' ms';
        if (navigator.share) {
            try { await navigator.share({ text: text }); } catch (e) {}
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            this.els.btnShare.textContent = 'Copied!';
            setTimeout(() => this.els.btnShare.textContent = 'Share result', 2000);
        }
    },

    // ---------- CONSENT ----------
    initConsent() {
        if (localStorage.getItem('pm_consent')) return;
        setTimeout(() => this.els.consentBar.classList.add('show'), 1500);
        document.getElementById('consent-accept').addEventListener('click', () => this.setConsent('accepted'));
        document.getElementById('consent-decline').addEventListener('click', () => this.setConsent('declined'));
    },

    setConsent(value) {
        try { localStorage.setItem('pm_consent', value); } catch (e) {}
        this.els.consentBar.classList.remove('show');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());