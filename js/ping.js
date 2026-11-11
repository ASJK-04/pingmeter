const PingTest = {
    url: 'https://speed.cloudflare.com/__down?bytes=0',
    samples: 10,

    async run(onProgress) {
        const results = [];
        for (let i = 0; i < this.samples; i++) {
            const start = performance.now();
            try {
                await fetch(this.url + '&t=' + Date.now(), { cache: 'no-store' });
                results.push(performance.now() - start);
            } catch (e) {
                results.push(999);
            }
            if (onProgress) onProgress(i + 1, this.samples);
        }

        const valid = results.slice(1).filter(r => r < 999);
        const sorted = valid.slice().sort((a, b) => a - b);
        const ping = Math.round(sorted[Math.floor(sorted.length / 2)] || 0);

        let jitterSum = 0;
        for (let i = 1; i < valid.length; i++) {
            jitterSum += Math.abs(valid[i] - valid[i - 1]);
        }
        const jitter = Math.round(jitterSum / Math.max(valid.length - 1, 1));

        return { ping: ping, jitter: jitter };
    }
};