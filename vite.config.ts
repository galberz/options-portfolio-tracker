import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // If an optimizeDeps section exists, ensure it's empty or
  // does not mention 'js-quantities' or 'financial' for now.
  // Example of an empty one if you had it:
  // optimizeDeps: {},
})
