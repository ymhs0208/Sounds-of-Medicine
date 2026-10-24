import { APP_NAME } from "./lib/brand";

/**
 * Scaffold only. Do not add the ios/ or android/ projects until the store build.
 * `webDir` matches `npm run build:static`, which writes the offline demo to out/.
 */
const config = {
  appId: "tw.yaosheng.app",
  appName: APP_NAME,
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
