import { Hono } from 'hono';

const app = new Hono();
const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y';

// 定义一个工具函数，添加 CORS 头
function setCORSHeaders(res) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

app.post('/api/verify-turnstile', async (c) => {
    try {
        const body = await c.req.json();
        const token = body.token;
        if (!token) {
            setCORSHeaders(c.res);
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
        setCORSHeaders(c.res);
        if (data.success) {
            return c.json({ success: true, from_worker: true });
        } else {
            return c.json({ success: false, errors: data['error-codes'], from_worker: true }, 403);
        }
    } catch (err) {
        setCORSHeaders(c.res);
        return c.json({ success: false, error: err.message || String(err), from_worker: true }, 500);
    }
});

// OPTIONS 必须�� CORS
app.options('/*', (c) => {
    setCORSHeaders(c.res);
    return c.text('', 204);
});

// 兜底路由也要加 CORS
app.all('*', (c) => {
    setCORSHeaders(c.res);
    return c.json({ success: false, error: 'Not Found', from_worker: true }, 404);
});

export default {
    fetch: app.fetch
}