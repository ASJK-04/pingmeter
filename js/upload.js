/**
 * PingMeter - Upload Speed Measurement (Optimized)
 * Reduced chunk size and duration
 */

const UploadTest = {
    url: '/upload',
    duration: 5000,              // 5 seconds (was 8)
    chunkSize: 1 * 1024 * 1024,  // 1 MB per chunk (was 2 MB)

    async run(onProgress) {
        let totalUploaded = 0;
        const startTime = performance.now();

        while (performance.now() - startTime < this.duration) {
            const blob = this._generateBlob(this.chunkSize);

            try {
                await this._uploadChunk(blob, (loaded) => {
                    const elapsed = (performance.now() - startTime) / 1000;
                    const currentTotal = totalUploaded + loaded;
                    const speed = (currentTotal * 8) / elapsed / 1000000;
                    if (onProgress) onProgress(speed);
                });
                totalUploaded += this.chunkSize;
            } catch (e) {
                break;
            }
        }

        const elapsed = (performance.now() - startTime) / 1000;
        const speedMbps = (totalUploaded * 8) / elapsed / 1000000;

        return Math.round(speedMbps * 100) / 100;
    },

    _uploadChunk(blob, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.url + '?t=' + Date.now());

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(e.loaded);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.timeout = 10000;
            xhr.ontimeout = () => reject(new Error('Timeout'));

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
    }
};