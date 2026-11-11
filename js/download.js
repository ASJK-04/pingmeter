const DownloadTest = {
    url: 'https://speed.cloudflare.com/__down?bytes=25000000',
    duration: 6000,
    warmup: 1500,
    streams: 4,

    async run(onProgress) {
        this._totalBytes = 0;
        this._warmupBytes = 0;
        const startTime = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.duration);

        try {
            const promises = Array.from({ length: this.streams }, () =>
                this._stream(controller.signal, startTime, onProgress)
            );
            await Promise.allSettled(promises);
            if (this._totalBytes === 0) throw new Error('Download failed');
        } finally {
            clearTimeout(timeout);
        }

        const elapsed = (performance.now() - startTime) / 1000;
        const steadyBytes = this._totalBytes - this._warmupBytes;
        const steadyTime = Math.max(elapsed - (this.warmup / 1000), 0.1);
        const speed = (steadyBytes * 8) / steadyTime / 1000000;

        return Math.round(speed * 100) / 100;
    },

    async _stream(signal, startTime, onProgress) {
        try {
            while (!signal.aborted) {
                const res = await fetch(this.url + '&t=' + Date.now(), {
                    signal: signal,
                    cache: 'no-store'
                });
                if (!res.ok || !res.body) throw new Error('Server error ' + res.status);
                const reader = res.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    this._totalBytes += value.length;
                    if (performance.now() - startTime < this.warmup) {
                        this._warmupBytes += value.length;
                    }
                    if (onProgress) {
                        const el = (performance.now() - startTime) / 1000;
                        onProgress((this._totalBytes * 8) / el / 1000000);
                    }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') throw e;
        }
    },

    _totalBytes: 0,
    _warmupBytes: 0
};