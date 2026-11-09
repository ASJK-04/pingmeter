const UploadTest = {
    url: '/upload',
    duration: 6000,
    warmup: 1200,
    streams: 3,
    chunkSize: 2 * 1024 * 1024,

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
        while (!signal.aborted && performance.now() - startTime < this.duration) {
            const blob = this._generateBlob(this.chunkSize);
            const ok = await this._send(blob, signal, startTime,
                (loaded) => {
                    const el = (performance.now() - startTime) / 1000;
                    onProgress(((this._totalBytes + loaded) * 8) / el / 1000000);
                },
                (bytes, atMs) => {
                    this._totalBytes += bytes;
                    if (atMs - startTime < this.warmup) this._warmupBytes += bytes;
                }
            );
            if (!ok) break;
        }
    },

    _send(blob, signal, startTime, onProgress, onDone) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.url + '?t=' + Date.now());

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(e.loaded);
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    onDone(blob.size, performance.now());
                    resolve(true);
                } else resolve(false);
            };
            xhr.onerror = () => resolve(false);
            xhr.onabort = () => resolve(false);
            signal.addEventListener('abort', () => xhr.abort());

            xhr.send(blob);
        });
    },

    _generateBlob(size) {
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < size; i += 65536) {
            const chunk = view.subarray(i, Math.min(i + 65536, size));
            crypto.getRandomValues(chunk);
        }
        return new Blob([buffer]);
    },

    _totalBytes: 0,
    _warmupBytes: 0
};