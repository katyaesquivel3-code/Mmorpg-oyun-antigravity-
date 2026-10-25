import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aistudio.otuken.game',
  appName: 'ÖTÜKEN: KUT\'UN DÖRT PARÇASI',
  webDir: 'app/src/main/assets/web',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#090d16',
    allowMixedContent: true
  }
};

export default config;
