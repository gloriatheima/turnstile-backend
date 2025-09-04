import { Hono } from 'hono'
// 本地路由使用引包
// import { serve } from '@hono/node-server'

const app = new Hono()

// 本地路由
// serve({
//     fetch: app.fetch,
//     port: 8787,
// })
// console.log('Hono server running at http://localhost:8787')

const TURNSTILE_SECRET = '0x4AAAAAABmNHKO15Y4NbK-JAw8T5pTpH9Y'

// 路由定义
app.post('/api/verify-turnstile', async (c) => {
    const body = await c.req.json()
    const token = body.token
    if (!token) {
        return c.json({ success: false, error: '缺少token' }, 400)
    }

    // 请求 Cloudflare Turnstile 校验
    const params = new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token
    })
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    })
    const data = await resp.json()
    if (data.success) {
        return c.json({ success: true })
    } else {
        return c.json({ success: false, errors: data['error-codes'] }, 403)
    }
})

// CORS 支持（推荐加上，前端跨域时必��）
app.use('/*', async (c, next) => {
    await next()
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
})

app.options('/*', (c) => {
    return c.text('', 204) // 预检请求
})

export default {
    fetch: app.fetch
}