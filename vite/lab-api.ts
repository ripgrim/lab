import type { ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { keep, toss } from '../scripts/verdict.mjs'

const send = (res: ServerResponse, status: number, body: object) => {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

export function labApi(root: string): Plugin {
  return {
    name: 'lab-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__lab', async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
        let body = ''
        for await (const chunk of req) body += chunk
        const { slug, reason } = JSON.parse(body || '{}') as { slug?: string; reason?: string }
        const action = req.url?.replace(/^\//, '')
        try {
          if (action === 'keep') return send(res, 200, keep(root, slug ?? ''))
          if (action === 'toss') return send(res, 200, toss(root, slug ?? '', reason))
          send(res, 404, { error: `Unknown action "${action}"` })
        } catch (error) {
          send(res, (error as { status?: number }).status ?? 500, { error: (error as Error).message })
        }
      })
    },
  }
}
