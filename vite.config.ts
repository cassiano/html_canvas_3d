import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Use the boolean true to allow all hosts
    allowedHosts: true,
  },
})
