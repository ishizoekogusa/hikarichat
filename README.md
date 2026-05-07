# 點樣部署「阿光 (Hikari)」畀其他人玩？

如果你想將呢個 Web App 放上網畀朋友或者公眾玩，有幾個非常重要嘅步驟同安全事項需要注意：

## ⚠️ 1. 最重要嘅安全警告 (API Key 外洩風險)

目前嘅程式碼架構係**直接喺前端 (Frontend) 呼叫 Gemini API** (`process.env.API_KEY`)。
如果你直接將呢堆 code 變成靜態網頁 (Static Website) 放上網，**任何人都可以喺瀏覽器嘅 Network Tab 或者 Source Code 搵到你嘅 API Key**，然後盜用你嘅 Quota 甚至令你產生巨額帳單。

**強烈建議：絕對唔好直接將帶有真實 API Key 嘅前端程式碼公開部署。**

## 🛠️ 2. 正確且安全嘅部署架構 (Backend Proxy)

要安全地畀人玩，你需要寫一個簡單嘅後端 (Backend) 嚟隱藏 API Key：

1. **前端 (React / 你而家寫好嘅 UI)**：只負責顯示介面，將用家打嘅字同上傳嘅相片 send 去你嘅專屬後端 API。
2. **後端 (Node.js / Vercel Serverless Functions / Cloudflare Workers)**：
   - 接收前端嘅 request。
   - 喺伺服器端讀取環境變數 (`API_KEY`)。
   - 代為呼叫 Google Gemini API。
   - 將 Gemini 嘅回覆傳返畀前端。

咁樣做，用家就永遠睇唔到你嘅 API Key。

---

# 🤖 點樣將阿光接入 Facebook Messenger？

**答案係：絕對可以！** 但係架構上會有好大改變。

Facebook Messenger **唔可以**直接連去你而家寫嘅 React 前端 (Frontend) 網頁。要接入 Messenger，你需要建立一個 **後端伺服器 (Backend Server)** 作為 Webhook，負責接收 Facebook 傳過嚟嘅訊息，然後交畀 Gemini 處理，最後再將 Gemini 嘅回覆 send 返畀 Facebook。

### 整合 Facebook Messenger 嘅 4 個主要步驟：

1. **建立 Facebook 專頁 (Page) 及 開發者應用程式 (Developer App)**
   - 去 [Facebook for Developers](https://developers.facebook.com/) 開一個 App。
   - 將 App 連結到你嘅 Facebook 專頁（例如開個專頁叫「阿光 Hikari」）。
   - 獲取 `PAGE_ACCESS_TOKEN`。

2. **建立 Node.js 後端伺服器 (Webhook)**
   - 你需要寫一個 Node.js (Express) 伺服器。
   - 設定一個 `/webhook` 路由 (Route) 畀 Facebook 驗證同埋接收訊息。
   - 將你而家喺 `services/gemini.ts` 入面嘅 Gemini 邏輯搬去呢個後端度。

3. **處理訊息與回覆**
   - 當 Webhook 收到用家喺 Messenger 打嘅字，後端會呼叫 `ai.chats.create().sendMessage()`。
   - 攞到 Gemini 嘅回覆後，使用 Facebook 嘅 Send API (`https://graph.facebook.com/v19.0/me/messages`) 將文字 send 返畀用家。

4. **部署後端伺服器**
   - 將呢個 Node.js 伺服器部署到 Render, Heroku, AWS, 或者 Google Cloud 等平台，並確保有一條 `https://` 嘅公開網址。
   - 將呢條網址填入 Facebook Developer Console 嘅 Webhook 設定入面。

### 💡 參考程式碼

我已經喺專案入面加咗一個 `backend-example/server.js` 檔案，入面包含咗一個完整嘅 Node.js + Express 範例，示範點樣將 Gemini API 同 Facebook Messenger Webhook 結合。你可以參考嗰個檔案嚟建立你嘅 Messenger Bot！
