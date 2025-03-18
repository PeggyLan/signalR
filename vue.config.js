// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '/notificationHub': {
        target: 'http://localhost:5023', // 配置為後端的端口
        changeOrigin: true, // 更改請求來源，解決 CORS 問題
        ws: true, // 啟用 WebSocket 支援，SignalR 需要
        secure: false // 如果後端是 HTTPS，這裡設為 true
      }
    },
    port: 8080 // Vue 前端運行的端口
  }
}
