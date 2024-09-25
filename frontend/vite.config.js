import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // รันผ่าน IP ใดๆ ก็ได้
    port: 5173,      // กำหนด port ที่จะใช้
  },
})
