import { Hono } from 'hono';

const app = new Hono();

const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y';

// 主业务路由
app.post('/api/verify-turnstile', async (c) => {
    const body = await c.req.json();
    const token = body.token;
    if (!token) {
        return c.json({ success: false, error: '缺少token' }, 400);
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
        return c.json({ success: true });
    } else {
        return c.json({ success: false, errors: data['error-codes'] }, 403);
    }
});

// CORS 支持，允许所��来源和基本跨域
app.use('/*', async (c, next) => {
    await next();
    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    // 推荐允许所有头或者加上常用的
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
});

// 处理所有 OPTIONS 预检请求，并加上 CORS 响应头
app.options('/*', (c) => {
    return c.text('', 204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
});

// 兜底路由：所有未命中的路径都返回 404
app.all('*', (c) => c.json({ success: false, error: 'Not Found' }, 404));

// Cloudflare Worker标准导出
export default {
    fetch: app.fetch
}