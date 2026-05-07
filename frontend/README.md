# 🎉 狀態：現在可以用了嗎？ (Is it ready to use?)

**👉 網頁版 (Web App)：絕對可以！現在已經 Ready！** 
你現在已經可以直接喺瀏覽器度同阿光傾偈、問功課、甚至上傳相片畀佢改。佢仲會記得你哋嘅對話（透過瀏覽器嘅 Local Storage）。

**👉 Facebook Messenger 版：需要你自己進行額外部署。** 
後端程式碼 (`backend-example/server.js`) 已經幫你寫好，但你需要自己準備一個伺服器 (例如 Google Cloud, Render, Heroku) 同埋申請 Facebook Developer 帳號嚟行呢段 Code。詳細步驟請參考下方教學。

---

# 🔗 點樣分享條 Link 畀其他人玩？ (How to share?)

如果你想將呢個 Web App 放上網畀朋友或者公眾玩，**絕對唔可以直接 Copy 網址畀人**，因為有極大嘅安全風險！

## ⚠️ 最重要嘅安全警告 (API Key 外洩風險)

目前嘅程式碼架構係**直接喺前端 (Frontend) 呼叫 Gemini API** (`process.env.API_KEY`)。
如果你直接將呢堆 code 變成靜態網頁 (Static Website) 放上網，**任何人都可以喺瀏覽器嘅 Network Tab 或者 Source Code 搵到你嘅 API Key**，然後盜用你嘅 Quota 甚至令你產生巨額帳單。

## ✅ 安全分享方法 1：面對面玩 (最簡單)
直接攞你部手機或者電腦，開住個畫面畀朋友親自試玩。呢個係最安全、完全唔需要搞 Server 嘅做法。

## ✅ 安全分享方法 2：部署到 Vercel (適合有少少 IT 底子嘅人)
如果你想畀條 Link 朋友自己喺屋企玩，你需要將程式碼打包並部署：

1. 喺你電腦開 Terminal，執行：`npm create vite@latest hikari-app -- --template react-ts`
2. 進入資料夾：`cd hikari-app`
3. 安裝依賴套件：`npm install @google/genai lucide-react react-markdown`
4. 將你而家嘅 `App.tsx`, `components/`, `services/`, `types.ts` 複製入去 `src/` 資料夾入面。
5. 將 `services/gemini.ts` 入面嘅 `process.env.API_KEY` 改為 `import.meta.env.VITE_API_KEY`。
6. 將成個 `hikari-app` push 上你嘅 GitHub Repository。
7. 申請一個 [Vercel](https://vercel.com/) 帳號，連接你嘅 GitHub Repo。
8. **最重要一步**：喺 Vercel 部署前嘅 "Environment Variables" 設定度，加入你嘅 API Key (Name: `VITE_API_KEY`, Value: `AIzaSy...`)。
9. 撳 "Deploy"。Vercel 會畀一條公開嘅 URL 你，你可以將呢條 Link share 畀人玩！
*(注意：雖然 Vercel 隱藏咗原始碼，但進階黑客依然可以喺瀏覽器 Network 截取到 VITE_API_KEY。如果想 100% 安全，請參考方法 3 或 4)*

## ✅ 安全分享方法 3：建立 Backend Proxy 或 Facebook Messenger Bot (100% 安全)
要 100% 安全地畀人玩，你需要寫一個簡單嘅後端 (Backend) 嚟隱藏 API Key。用家永遠睇唔到你嘅 API Key。

你可以將阿光變成一個 Facebook 專頁嘅 Chatbot！
1. 去 [Facebook for Developers](https://developers.facebook.com/) 開一個 App，連結到你嘅 Facebook 專頁。
2. 參考專案入面嘅 `backend-example/server.js` 檔案。
3. 將呢個 Node.js 伺服器部署到 Render, Heroku 等平台。
4. 將伺服器網址填入 Facebook Webhook 設定。
5. 搞掂！你朋友可以直接喺 Messenger 搵「阿光」傾偈！

---

# ☁️ 如何在 Google Cloud 上部署 Facebook Messenger Bot？

如果你想將 `backend-example` 部署到 Google Cloud，最簡單、最平（甚至免費）嘅方法係使用 **Google Cloud Run**。Cloud Run 可以直接將你嘅 Node.js 程式碼變成一個可以自動擴展嘅 HTTPS API。

### 部署步驟：

**第 1 步：準備 Google Cloud 環境**
1. 註冊 [Google Cloud](https://cloud.google.com/) 帳號並啟用計費功能 (Billing)。
2. 建立一個新嘅 Google Cloud Project。
3. 喺電腦安裝 [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install)。
4. 打開 Terminal，登入並設定 Project：
   ```bash
   gcloud auth login
   gcloud config set project <你的_PROJECT_ID>
   ```

**第 2 步：部署到 Cloud Run**
1. 喺 Terminal 進入 `backend-example` 資料夾：
   ```bash
   cd backend-example
   ```
   *(注意：我已經為你準備好 `package.json`，Cloud Run 會自動識別呢個係 Node.js 專案)*
2. 執行部署指令：
   ```bash
   gcloud run deploy hikari-bot --source . --region asia-east1 --allow-unauthenticated
   ```
3. 部署過程中，如果系統問你是否啟用 API (例如 Cloud Build API, Cloud Run API)，請輸入 `y` 允許。
4. 部署完成後，Terminal 會顯示一條 **Service URL** (例如 `https://hikari-bot-xxxxx-df.a.run.app`)。呢條就係你嘅 Webhook 網址！

**第 3 步：設定環境變數 (Environment Variables)**
因為程式需要 API Key 先生效，你需要去 Google Cloud Console 設定：
1. 打開 [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run)。
2. 點擊你啱啱建立嘅 `hikari-bot` 服務。
3. 點擊頂部嘅 **"Edit & Deploy New Revision"** (編輯並部署新修訂版本)。
4. 捲動到 **"Variables & Secrets"** (變數與密碼) 分頁。
5. 點擊 **"Add Variable"**，加入以下三個變數：
   - `GEMINI_API_KEY` : 你的 Google Gemini API Key
   - `PAGE_ACCESS_TOKEN` : 你的 Facebook Page Access Token
   - `VERIFY_TOKEN` : 你自己設定嘅 Facebook Webhook 驗證字串 (例如 `my_secret_token_123`)
6. 點擊 **"Deploy"**。

**第 4 步：連接 Facebook Messenger**
1. 返去 [Facebook Developer Console](https://developers.facebook.com/)。
2. 喺 Webhook 設定度，填入你頭先攞到嘅 Cloud Run URL，並喺後面加上 `/webhook` (例如 `https://hikari-bot-xxxxx-df.a.run.app/webhook`)。
3. 填入你啱啱設定嘅 `VERIFY_TOKEN`。
4. 驗證成功後，訂閱 `messages` 事件。
5. 搞掂！而家任何人喺 Facebook Messenger 搵你個專頁，Cloud Run 就會自動處理並回覆！

---

# 💾 點樣令 Chatbot 記得先前嘅對話？ (持久化記憶)

要令阿光記得你哋之前傾過咩，我哋需要將「對話紀錄 (History)」儲存起嚟，然後喺每次開新 Session 嘅時候餵返畀 Gemini。

### 方案 A：網頁版 (Frontend) 嘅做法
喺而家嘅 React 程式碼入面，我已經幫你加咗 **`localStorage`** 嘅功能。
- **原理**：每次你同阿光傾偈，程式會將對話自動 save 喺你瀏覽器嘅 Local Storage 入面。
- **效果**：就算你 F5 重新整理網頁，或者聽日再開返個網頁，阿光都會記得你哋之前講過咩。
- **限制**：記憶只會留喺你而家用緊嘅呢部電腦/手機嘅瀏覽器入面。如果你換咗部手機，記憶就唔會同步過去。

### 方案 B：Facebook Messenger / 後端 (Backend) 嘅做法
如果你將阿光接入 Facebook Messenger，因為伺服器 (Server) 隨時會重啟，放喺 Memory (`new Map()`) 嘅紀錄會消失。你需要一個 **資料庫 (Database)**：
1. **選擇 Database**：例如 MongoDB, Firebase Firestore, PostgreSQL, 或者 Redis。
2. **儲存格式**：每次收到訊息，將 `{ role: 'user', parts: [{ text: '...' }] }` 同 `{ role: 'model', parts: [{ text: '...' }] }` 儲存入該用戶 (以 `sender_psid` 為 Key) 嘅 Array 入面。
3. **讀取記憶**：當用戶 send 新訊息嚟，先從 Database 讀取佢嘅 History Array，然後用 `ai.chats.create({ history: savedHistory })` 初始化 Gemini，咁阿光就會記得之前嘅對話啦！
