import { Hono } from 'hono';

const app = new Hono();

const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
};

app.use('/*', async (c, next) => {
    await next();
    Object.entries(corsHeaders).forEach(([k, v]) => c.res.headers.set(k, v));
});

// 一定要给OPTIONS响应加上CORS头，否则预检失败
app.options('/*', (c) => {
    return c.text('', 204, corsHeaders);
});

app.post('/api/verify-turnstile', async (c) => {
    const body = await c.req.json();
    const token = body.token;
    if (!token) {
        return c.json({ success: false, error: '缺少token' }, 400, corsHeaders);
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
        return c.json({ success: true }, 200, corsHeaders);
    } else {
        return c.json({ success: false, errors: data['error-codes'] }, 403, corsHeaders);
    }
});

// 兜底路由也要加CORS头
app.all('*', (c) => c.json({ success: false, error: 'Not Found' }, 404, corsHeaders));

export default {
    fetch: app.fetch
}