// Cloudflare Pages Function: POST /upload
// Receives data for upload speed testing
// Returns the number of bytes received

export async function onRequest(context) {
    // Handle CORS preflight
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await context.request.arrayBuffer();
        const receivedBytes = body.byteLength;

        return new Response(
            JSON.stringify({
                received: receivedBytes,
                timestamp: Date.now()
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'Upload processing failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}