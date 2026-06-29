import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// 本地数据保存插件：拦截 /api/save-json 请求，将数据保存至 docs/db_system_generated
function dbSaverPlugin() {
  return {
    name: 'vite-plugin-db-saver',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-json' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const { type, date, data } = payload
              if (!type || !date || !data) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: '缺少 type、date 或 data 参数' }))
                return
              }
              // 自动创建 docs/db_system_generated 文件夹
              const targetDir = path.resolve(process.cwd(), 'docs/db_system_generated')
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true })
              }
              const fileName = `${date}_${type}.json`
              const filePath = path.join(targetDir, fileName)
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
              
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, path: filePath }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), dbSaverPlugin()],
})
