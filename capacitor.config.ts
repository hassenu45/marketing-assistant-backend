import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.marketing.assistant',
  appName: 'المساعد التسويقي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://marketing-assistant-backend.onrender.com',
  },
}

export default config
