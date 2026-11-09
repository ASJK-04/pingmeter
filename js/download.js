const DownloadTest = {
    url: '/download',
    duration: 6000,
    warmup: 1200,
    streams: 4,
    maxMB: 25,

    async run(onProgress) {
        this._totalBytes = 0;
        this._warmupBytes = 0;
        const startTime = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.duration);

        const promises = [];
        for (let i = 0; i < this.streams; i++) {
            promises.push(this._stream(controller.signal, startTime, onProgress));
        }
        await Promise.allSettled(promises);
        clearTimeout(timeout);

        const elapsed = (performance.now() - startTime) / 1000;
        const steadyBytes = this._totalBytes - this._warmupBytes;
        const steadyTime = elapsed - this.warmup / 1000;
        const speed = steadyTime > 0 ? (steadyBytes * 8) / steadyTime / 1000000 : 0;

        return Math.round(speed * 100) / 100;
    },

    async _stream(signal, startTime, onProgress) {
        try {
            const res = await fetch(this.url + '?size=' + this.maxMB + '&t=' + Date.now(), {
                signal: signal,
                cache: 'no-store'
            });
            if (!res.ok || !res.body) return;

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
        } catch (e) {}
    },

    _totalBytes: 0,
    _warmupBytes: 0,

    reset() {
        this._totalBytes = 0;
        this._warmupBytes = 0;
    }
};