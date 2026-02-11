import { Hono } from 'hono';
import { cors } from 'hono/cors'

const app = new Hono();
const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y';

app.use('/*', cors({
  origin: 'https://turnstile.gloriatrials.com',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-turnstile-token'], // 必须包含你前端发的这个头
  exposeHeaders: ['x-turnstile-eid'], // 必须暴露，前端才拿得到 ID
}));

// 定义一个工具函数，添加 CORS 头
// function setCORSHeaders(res) {
//     res.headers.set('Access-Control-Allow-Origin', '*');
//     res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
//     res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With', 'x-turnstile-token');
// }
function setCORSHeaders(c) {
    // 1. Origin 建议指定具体的域名，或者设为 '*'
    c.header('Access-Control-Allow-Origin', 'https://turnstile.gloriatrials.com');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    // 2. 这里的语法修正：所有允许的头要写在一个字符串里，逗号隔开
    // 必须包含你在 Vue 里传的 'x-turnstile-token'
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-turnstile-token');
    // 3. 暴露 Header，让前端能看见 x-turnstile-eid
    c.header('Access-Control-Expose-Headers', 'x-turnstile-eid');
}

// app.post('/api/verify-turnstile', async (c) => {
//     try {
//         const body = await c.req.json();
//         const token = body.token;
//         if (!token) {
//             setCORSHeaders(c.res);
//             return c.json({ success: false, error: '缺少token', from_worker: true }, 400);
//         }
//         const params = new URLSearchParams({
//             secret: TURNSTILE_SECRET,
//             response: token
//         });
//         const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//             body: params
//         });
//         const data = await resp.json();
//         setCORSHeaders(c.res);
//         if (data.success) {
//             return c.json({ success: true, from_worker: true });
//         } else {
//             return c.json({ success: false, errors: data['error-codes'], from_worker: true }, 403);
//         }
//     } catch (err) {
//         setCORSHeaders(c.res);
//         return c.json({ success: false, error: err.message || String(err), from_worker: true }, 500);
//     }
// });

app.post('/api/verify-turnstile', async (c) => {
    // 先统一设置跨域头
    setCORSHeaders(c);

    try {
        const body = await c.req.json();
        const token = body.token;
        if (!token) {
            return c.json({ success: false, error: '缺少token' }, 400);
        }

        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret: TURNSTILE_SECRET,
                response: token
            })
        });

        const data = await resp.json();

        if (data.success) {
            // --- 核心改动 ---
            const eid = data.ephemeral_id || '';
            if (eid) {
                // 将 EID 放入 Header，供 WAF 频率限制使用
                c.header('x-turnstile-eid', eid);
            }
            // 同时也返回在 JSON 里，方便前端 Vue 存入 localStorage
            return c.json({ 
                success: data.success,
            ephemeral_id: eid,           // 核心：临时 ID
            'x-turnstile-eid': eid,      // 冗余一份 Header 名，方便你观察
            'x-turnstile-token': clientTokenHeader, // 确认后端收到了你前端发的头
            from_worker: true,
            full_data: data              // 打印 Cloudflare 返回的所有原始字段
            });
        } else {
            return c.json({ success: false, errors: data['error-codes'] }, 403);
        }
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

// OPTIONS 必须配置 CORS
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