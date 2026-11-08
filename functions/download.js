// Cloudflare Pages Function: GET /download?size=25
// Streams data for download speed testing
// size param = MB to stream (default 25)

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const sizeMB = Math.min(parseInt(url.searchParams.get('size') || '25'), 200);
    const chunkSize = 65536; // 64KB chunks
    const totalBytes = sizeMB * 1024 * 1024;
    const totalChunks = Math.ceil(totalBytes / chunkSize);

    // Pre-generate one chunk with pseudo-random data
    const baseChunk = new Uint8Array(chunkSize);
    for (let i = 0; i < chunkSize; i++) {
        baseChunk[i] = (i * 7 + 13) % 256;
    }

    const stream = new ReadableStream({
        start(controller) {
            for (let i = 0; i < totalChunks; i++) {
                controller.enqueue(baseChunk.slice());
            }
            controller.close();
        }
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': totalBytes.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*',
            'X-Content-Size': totalBytes.toString()
        }
    });
}