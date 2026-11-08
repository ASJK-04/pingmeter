// Cloudflare Pages Function: GET /ping
// Returns a tiny response for latency measurement

export async function onRequest(context) {
    return new Response(
        JSON.stringify({
            timestamp: Date.now(),
            status: 'ok'
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Access-Control-Allow-Origin': '*'
            }
        }
    );
}