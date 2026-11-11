const UploadTest = {
    url: 'https://speed.cloudflare.com/__up',
    duration: 6000,
    warmup: 1500,
    streams: 3,
    chunkSize: 2 * 1024 * 1024,

    async run(onProgress) {
        this._totalBytes = 0;
        this._warmupBytes = 0;
        this._blob = this._blob || this._generateBlob(this.chunkSize);

        const startTime = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.duration);

        try {
            const promises = Array.from({ length: this.streams }, () =>
                this._stream(controller.signal, startTime, onProgress)
            );
            await Promise.allSettled(promises);
            if (this._totalBytes === 0) throw new Error('Upload failed');
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
        while (!signal.aborted) {
            const ok = await this._send(signal, startTime, onProgress);
            if (!ok) {
                if (signal.aborted) break;
                throw new Error('Upload failed');
            }
        }
    },

    _send(signal, startTime, onProgress) {
        return new Promise((resolve) => {
            if (signal.aborted) return resolve(false);

            const xhr = new XMLHttpRequest();
            let lastLoaded = 0;

            const onAbort = () => xhr.abort();
            signal.addEventListener('abort', onAbort, { once: true });

            const finish = (ok) => {
                signal.removeEventListener('abort', onAbort);
                resolve(ok);
            };

            xhr.open('POST', this.url);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const delta = e.loaded - lastLoaded;
                    lastLoaded = e.loaded;
                    this._totalBytes += delta;
                    if (performance.now() - startTime < this.warmup) {
                        this._warmupBytes += delta;
                    }
                    if (onProgress) {
                        const el = (performance.now() - startTime) / 1000;
                        onProgress((this._totalBytes * 8) / el / 1000000);
                    }
                }
            };
            xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300);
            xhr.onerror = () => finish(false);
            xhr.onabort = () => finish(false);

            xhr.send(this._blob);
        });
    },

    _generateBlob(size) {
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < size; i += 65536) {
            const chunk = view.subarray(i, Math.min(i + 65536, size));
            for (let j = 0; j < chunk.length; j++) chunk[j] = j % 256;
        }
        return new Blob([buffer]);
    },

    _totalBytes: 0,
    _warmupBytes: 0,
    _blob: null
};