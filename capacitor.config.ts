/**
 * Scaffold only. Do not add the ios/ or android/ projects until the store build.
 * `webDir` matches `npm run build:static`, which writes the offline demo to out/.
 */
const config = {
  appId: "tw.yaosheng.app",
  appName: "藥聲",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
