/**
 * PingMeter - Main Application Controller
 * Orchestrates the test sequence and updates the UI
 */

const App = {
    // DOM Elements
    els: {},

    // Test state
    state: {
        running: false,
        results: {
            ping: null,
            jitter: null,
            download: null,
            upload: null
        }
    },

    init() {
        // Cache DOM elements
        this.els = {
            btnStart: document.getElementById('btn-start'),
            statusText: document.getElementById('status-text'),
            speedNumber: document.getElementById('speed-number'),
            gaugeRing: document.getElementById('gauge-ring'),
            pingVal: document.getElementById('ping-val'),
            jitterVal: document.getElementById('jitter-val'),
            dlVal: document.getElementById('dl-val'),
            ulVal: document.getElementById('ul-val')
        };

        // Bind start button
        this.els.btnStart.addEventListener('click', () => this.startTest());

        // Load history
        this.loadHistory();
    },

    async startTest() {
        if (this.state.running) return;
        this.state.running = true;

        // Reset UI
        this.els.btnStart.disabled = true;
        this.els.btnStart.textContent = 'TESTING...';
        this.els.statusText.style.color = 'var(--text-muted)';
        this._resetMetrics();

        try {
            // Phase 1: Ping
            this._setStatus('Measuring Ping & Jitter...');
            this._setGauge(0);
            const pingResult = await PingTest.run();
            this.state.results.ping = pingResult.ping;
            this.state.results.jitter = pingResult.jitter;
            this._updatePing(pingResult.ping, pingResult.jitter);

            // Phase 2: Download
            this._setStatus('Testing Download Speed...');
            this._setGauge(0);
            this.els.speedNumber.textContent = '0.0';
            DownloadTest.reset();
            const downloadSpeed = await DownloadTest.run((speed) => {
                this._updateGauge(speed, 200);
            });
            this.state.results.download = downloadSpeed;
            this._updateDownload(downloadSpeed);

            // Phase 3: Upload
            this._setStatus('Testing Upload Speed...');
            this._setGauge(0);
            this.els.speedNumber.textContent = '0.0';
            const uploadSpeed = await UploadTest.run((speed) => {
                this._updateGauge(speed, 100);
            });
            this.state.results.upload = uploadSpeed;
            this._updateUpload(uploadSpeed);

            this._setStatus('Test Complete!');
            this.els.statusText.style.color = 'var(--accent)';
            this._updateGauge(downloadSpeed, 200);

            // Save to history
            this.saveResult();

        } catch (error) {
            this._setStatus('Test failed. Check connection and try again.');
            this.els.statusText.style.color = '#ef4444';
            console.error('Speed test error:', error);
        }

        // Re-enable button
        this.els.btnStart.textContent = 'TEST AGAIN';
        this.els.btnStart.disabled = false;
        this.state.running = false;
    },

    // --- UI Update Methods ---

    _setStatus(text) {
        this.els.statusText.textContent = text;
    },

    _setGauge(percent) {
        this.els.gaugeRing.style.setProperty('--progress', percent + '%');
    },

    _updateGauge(speedMbps, maxScale) {
        const percent = Math.min((speedMbps / maxScale) * 100, 100);
        this._setGauge(percent);
        this.els.speedNumber.textContent = speedMbps.toFixed(1);
    },

    _showFinalSpeed(speed) {
        this.els.speedNumber.textContent = speed.toFixed(1);
    },

    _updatePing(ping, jitter) {
        this.els.pingVal.innerHTML = ping + ' <small>ms</small>';
        this.els.jitterVal.innerHTML = jitter + ' <small>ms</small>';
    },

    _updateDownload(speed) {
        this.els.dlVal.innerHTML = speed.toFixed(1) + ' <small>Mbps</small>';
    },

    _updateUpload(speed) {
        this.els.ulVal.innerHTML = speed.toFixed(1) + ' <small>Mbps</small>';
    },

    _resetMetrics() {
        this.els.pingVal.innerHTML = '-- <small>ms</small>';
        this.els.jitterVal.innerHTML = '-- <small>ms</small>';
        this.els.dlVal.innerHTML = '-- <small>Mbps</small>';
        this.els.ulVal.innerHTML = '-- <small>Mbps</small>';
        this.els.speedNumber.textContent = '0.0';
        this._setGauge(0);
    },

    // --- History (localStorage) ---

    saveResult() {
        const history = this.getHistory();
        history.unshift({
            date: new Date().toISOString(),
            ping: this.state.results.ping,
            jitter: this.state.results.jitter,
            download: this.state.results.download,
            upload: this.state.results.upload
        });
        // Keep only last 10
        const trimmed = history.slice(0, 10);
        try {
            localStorage.setItem('pingmeter_history', JSON.stringify(trimmed));
        } catch (e) { /* localStorage full or blocked */ }
    },

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('pingmeter_history')) || [];
        } catch (e) {
            return [];
        }
    },

    loadHistory() {
        // History display can be added to UI later
        // For now, just ensure data is accessible
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());