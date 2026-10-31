// src/lib/api.ts

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return ''
  
  // 如果你是直接開啟本機前端的 3002 埠（繞過 Nginx）
  if (window.location.port === '3002') {
    return 'http://localhost:8002' // 對應後端在 docker-compose.dev.yml 的對外 Port
  }
  
  // 如果是透過 Nginx 閘道器或正式環境，則回傳空字串（走相對路徑）
  return ''
}

export const API_BASE_URL = getApiBaseUrl()