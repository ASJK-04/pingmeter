/**
 * PingMeter - Download Speed Measurement (Optimized)
 * Adaptive approach to minimize data usage
 */

const DownloadTest = {
    url: '/download',
    duration: 5000,     // 5 seconds (was 8)
    streams: 3,         // 3 streams (was 4)
    maxMB: 25,          // Cap at 25 MB per stream

    async run(onProgress) {
        let totalBytes = 0;
        const startTime = performance.now();
        const controller = new AbortController();

        // Stop after duration
        const timeout = setTimeout(() => controller.abort(), this.duration);

        // Create parallel download streams
        const promises = [];
        for (let i = 0; i < this.streams; i++) {
            promises.push(this._stream(controller.signal, startTime, onProgress));
        }

        await Promise.allSettled(promises);
        clearTimeout(timeout);

        // Calculate final speed
        const elapsed = (performance.now() - startTime) / 1000;
        const speedMbps = (this._totalBytes * 8) / elapsed / 1000000;

        return Math.round(speedMbps * 100) / 100;
    },

    async _stream(signal, startTime, onProgress) {
        try {
            const response = await fetch(this.url + '?size=' + this.maxMB + '&t=' + Date.now(), {
                signal: signal,
                cache: 'no-store'
            });

            if (!response.ok || !response.body) return;

            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                this._totalBytes += value.length;

                if (onProgress) {
                    const elapsed = (performance.now() - startTime) / 1000;
                    const currentSpeed = (this._totalBytes * 8) / elapsed / 1000000;
                    onProgress(currentSpeed);
                }
            }
        } catch (e) {
            // Aborted - expected
        }
    },

    _totalBytes: 0,

    reset() {
        this._totalBytes = 0;
    }
};