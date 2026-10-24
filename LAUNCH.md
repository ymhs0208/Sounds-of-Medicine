# 藥聲上線清單

Worker 名稱維持 `sounds-of-medicine`。Cloudflare Workers Builds：

- 建置指令：`npx opennextjs-cloudflare build`
- 部署指令：`npx wrangler deploy`

選用的 KV、D1、Rate Limiting binding 在 `wrangler.jsonc` 裡維持註解。沒有建立 namespace 時，部署不會失敗。Cron `*/15 * * * *` 已寫進設定；沒有 VAPID 與 `YAOSHENG_PUSH` 時，排程只回傳未設定，不會送出通知。

建置前可設定 `NEXT_PUBLIC_SITE_URL`（例如 `https://你的網域`）。沒設時，sitemap 與 Open Graph 會用 `https://yaosheng.example`。

## 一定要設定

| 名稱 | 類型 | 用途 |
| --- | --- | --- |
| `OPENAI_API_KEY` | Secret | 拍照辨識與翻譯。沒有時這兩項回 503，手動輸入仍可用。 |
| `OPENAI_MODEL` | 選用，純文字變數 | 預設 `gpt-4o-mini`。 |
| `OPENAI_BASE_URL` | 選用，純文字變數 | 預設 `https://api.openai.com/v1`。 |

`npx wrangler deploy` 預設不會保留儀表板上「沒寫進 wrangler.jsonc」的純文字變數。Secret 不會被刪。若純文字變數被清掉，部署指令改成 `npx wrangler deploy --keep-vars`。

## 背景提醒（選用）

1. 本機執行 `node scripts/generate-vapid.mjs`。不要把輸出提交進 git。
2. 把 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT` 設成 Secret。`VAPID_SUBJECT` 用 `mailto:` 加上真實信箱，取代腳本裡的 `【待填】`。
3. 建立 KV namespace，在 `wrangler.jsonc` 取消 `YAOSHENG_PUSH` 與 `YAOSHENG_PUSH_ENABLED` 的註解，填上 namespace id，再部署。
4. Cron 已是每 15 分鐘。它只送鐘點與通知語言，不送藥名或姓名。

Android Chrome、桌面 Chrome / Edge，以及 iOS 16.4 以上且已加入主畫面，才能在 App 關掉時收到。沒設定時，App 開著的提醒仍可用。

## 付費介面的流量限制（建議公開前打開）

`/api/extract` 與 `/api/translate` 每個 isolate 都有記憶體限流。公開流量請再打開其中一個，否則每個 isolate 各自計數：

- Cloudflare Rate Limiting：取消 `YAOSHENG_RATE_LIMIT` 註解。`namespace_id` 是你自己選的字串，不用另外建立資源。
- 或 KV：建立 namespace，取消 `YAOSHENG_LIMITS` 與 `YAOSHENG_LIMITS_ENABLED`。

兩者都沒有時，程式改走記憶體，路由不會因此壞掉。

## 照護圈、LINE 登入與 D1（選用）

沒有這些設定時，藥櫃仍只在手機上，部署不會失敗。同步畫面會寫雲端同步還沒打開。

1. 到 [LINE Developers](https://developers.line.biz/) 建立一個 LINE Login channel。權限只開 `openid` 與 `profile`，不要預設讀取 email。
2. Callback URL 填 `https://<worker-domain>/api/auth/line/callback`。本機預覽若要測登入，LINE 後台也要登記那個網址。
3. 建立資料庫並套用遷移：

```bash
npx wrangler d1 create yaosheng
npx wrangler d1 migrations apply yaosheng --remote
```

4. 在 `wrangler.jsonc` 取消 `YAOSHENG_DB` 那段註解，填上 `database_id`，並設 `YAOSHENG_DB_ENABLED` 為 `"1"`。`migrations_dir` 指到 `migrations/`。
5. 設這些 Secret：

| 名稱 | 用途 |
| --- | --- |
| `LINE_CHANNEL_ID` | LINE Login channel 的 Channel ID |
| `LINE_CHANNEL_SECRET` | Channel secret |
| `LINE_CALLBACK_URL` | 與後台完全相同的 `https://<worker-domain>/api/auth/line/callback` |
| `SESSION_SECRET` | 自訂一長串隨機字，用來簽登入 cookie |

金鑰只留在手機與復原碼。伺服器只存密文。刪除帳號會清掉該使用者的伺服器資料，以及只有他一個人的照護圈。

## 其他選用項目

| 名稱 | 打開方式 |
| --- | --- |
| 家屬短連結 `YAOSHENG_SYNC` | 建立 KV，取消註解與 `YAOSHENG_SYNC_ENABLED`。沒有時，分享仍是網址裡的加密內容。 |
| Turnstile | Secret `TURNSTILE_SECRET_KEY` 與 `TURNSTILE_SITE_KEY` 都要有。缺一個就保持關閉。 |
| Sentry | Secret `SENTRY_DSN`。沒有就不上報。上報前會去掉網址參數、信箱，且不附藥櫃內容。 |
| Cloudflare Web Analytics | 純文字或 Secret `CF_ANALYTICS_TOKEN`。沒有就不載入 beacon，也不使用 cookie。 |

## 自訂網域

在 Worker → Settings → Domains 加上網域，DNS 依 Cloudflare 指示。上線網址確定後，用該網址重新建置，讓 `NEXT_PUBLIC_SITE_URL` 寫進 sitemap 與分享預覽。

## 還需要人處理

- 隱私權說明、使用條款、免責聲明裡的 `【待填】` 要換成營運者名稱、地址與聯絡信箱。這是個資法告知事項，不能留著上線。
- 請律師或法務看過三份文件，確認聯絡窗口、保存期間與刪除方式。
- `VAPID_SUBJECT` 的信箱要有人收信。
- App Store / Google Play 尚未包進這個儲存庫。`capacitor.config.ts` 只是之後用 Capacitor 包一層的起點，見 README。送審文案、隱私營養標籤、帳號都要另外準備。
- 藥聲不是醫療器材，也不提供醫療建議。商店與網站文案請維持「翻譯、朗讀、整理、記錄藥袋上的字」。
