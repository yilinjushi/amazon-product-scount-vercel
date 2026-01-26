import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/amazon-scout-agent/', // ⚠️ 注意：这里假设你的仓库名叫 amazon-scout-agent。如果不是，请修改这里。
  build: {
    outDir: 'dist',
  }
})