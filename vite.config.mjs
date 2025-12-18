import { defineConfig } from 'vite';

export default defineConfig({
  // 静态站点默认即可；此处预留将来需要自定义 base 的场景
  server: {
    port: 8000,
    strictPort: true
  },
  preview: {
    port: 8000,
    strictPort: true
  }
});


