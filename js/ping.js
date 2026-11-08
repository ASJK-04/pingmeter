/**
 * PingMeter - Ping & Jitter Measurement
 * Measures latency by timing small fetch requests
 */

const PingTest = {
    url: '/ping',
    samples: 5,

    async run(onProgress) {
        const results = [];

        for (let i = 0; i < this.samples; i++) {
            const start = performance.now();
            try {
                await fetch(this.url + '?t=' + Date.now(), {
                    method: 'GET',
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const end = performance.now();
                results.push(end - start);
            } catch (e) {
                results.push(999); // Timeout fallback
            }
            if (onProgress) onProgress(i + 1, this.samples);
        }

        // Remove the first sample (warm-up)
        const validResults = results.slice(1);

        // Average ping
        const avgPing = Math.round(
            validResults.reduce((a, b) => a + b, 0) / validResults.length
        );

        // Jitter = average difference between consecutive pings
        let jitterSum = 0;
        for (let i = 1; i < validResults.length; i++) {
            jitterSum += Math.abs(validResults[i] - validResults[i - 1]);
        }
        const jitter = Math.round(jitterSum / (validResults.length - 1));

        return { ping: avgPing, jitter: jitter };
    }
};