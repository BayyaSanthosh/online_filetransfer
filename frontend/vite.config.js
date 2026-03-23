import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/upload': 'http://localhost:5000',
            '/download': 'http://localhost:5000'
        }
    }
})
