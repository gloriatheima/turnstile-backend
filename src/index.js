import { Hono } from 'hono';

const app = new Hono();
const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y';

app.post('/api/verify-turnstile', async (c) => {
    try {
        const body = await c.req.json();
        const token = body.token;
        if (!token) {
            return c.json({ success: false, error: '缺少token', from_worker: true }, 400);
        }
        const params = new URLSearchParams({
            secret: TURNSTILE_SECRET,
            response: token
        });
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await resp.json();
        if (data.success) {
            return c.json({ success: true, from_worker: true });
        } else {
            return c.json({ success: false, errors: data['error-codes'], from_worker: true }, 403);
        }
    } catch (err) {
        return c.json({ success: false, error: err.message || String(err), from_worker: true }, 500);
    }
});

// CORS 和 OPTIONS 路由同你现有的即可

app.use('/*', async (c, next) => {
    await next();
    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
});

app.options('/*', (c) => {
    return c.text('', 204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
});

app.all('*', (c) => c.json({ success: false, error: 'Not Found', from_worker: true }, 404));

export default {
    fetch: app.fetch
}