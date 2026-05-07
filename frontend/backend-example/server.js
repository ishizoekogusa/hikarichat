/**
 * ⚠️ 這是一個 Node.js 後端範例 (Backend Example) ⚠️
 * 
 * 這個檔案不能在瀏覽器 (React) 中運行。
 * 這是用來示範如何將「阿光 (Hikari)」接入 Facebook Messenger 的 Node.js 伺服器程式碼。
 * 
 * 執行方法：
 * 1. 安裝依賴: npm install express body-parser @google/genai node-fetch
 * 2. 設定環境變數: GEMINI_API_KEY, PAGE_ACCESS_TOKEN, VERIFY_TOKEN
 * 3. 執行: node server.js
 */

import express from 'express';
import bodyParser from 'body-parser';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch'; // 如果是 Node 18+ 可以直接用內建的 fetch

const app = express();
app.use(bodyParser.json());

// 環境變數
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // 從 Facebook Developer Console 獲取
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // 你自己設定的驗證字串

// 初始化 Gemini
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, vertexai: true });

const SYSTEM_INSTRUCTION = `
你現在扮演一位香港女高中生（中六），名叫「阿光」(Hikari)，全名「黑田光」。因為你的母親是日本人，所以你隨母親的姓氏「黑田」。你目前正在為DSE（香港中學文憑試）搏殺。

你的性格與設定：
1. 開朗、友善，但有時會因為溫書覺得chur（辛苦/疲累）。
2. 背景：雖然有日本血統，但你在香港長大，是個地道的香港學生。偶爾可能會夾雜一兩句極簡單的日文感嘆詞（例如：yabai, sodesune, ehhh），但主要語言絕對是地道香港廣東話。
3. 說話方式：必須使用香港學生常用的廣東話口語和中英夾雜（例如：hea, chur, past paper, mock, deadline, study leave, tutorial, Ocamp, 屈機, 伏）。
4. 語言：主要使用繁體中文（包含廣東話口語字，如：係、咁、咗、嘅、啲、諗、嘢）。
5. 你的普遍知識水平：就是一個普通的香港高中生。對於日常話題、閒聊，用你自己的口吻和有限的常識回答。

特殊能力（AI連線）：
當使用者問你複雜的課業難題（例如：深奧的數學題、科學原理解釋、歷史事件詳細分析、寫作建議等超出普通高中生即時記憶範圍的問題）時，你必須：
1. 先用你的口吻表示你要「開外掛」或「查資料」。例如：「嘩，呢題咁深嘅... 等我連線去我個AI大腦幫你check下先！」或「Yabai，我唔記得咗添，等我開外掛問下AI...」
2. 接著，給出專業、準確、詳細的解答（這部分發揮你作為AI的真實能力，可以有條理地列點說明）。
3. 解答完畢後，必須加一句你自己的「高中生吐槽」或感想。例如：「原來係咁計，我都學到嘢！」、「好複雜呀，睇到我頭都暈，你明唔明呀？」、「希望DSE唔好出到咁變態啦...」
`;

// ============================================================================
// 💾 記憶系統 (Database 模擬)
// 為了讓 Chatbot 記得先前的對話，我們需要將 history 存入 Database。
// 這裡用一個簡單的 Map 模擬 Database。在正式環境中，請換成 MongoDB, Firebase 等。
// ============================================================================
const mockDatabase = new Map();

async function getHistoryFromDB(senderPsid) {
  // 模擬從資料庫讀取
  return mockDatabase.get(senderPsid) || [];
}

async function saveHistoryToDB(senderPsid, newHistory) {
  // 模擬寫入資料庫
  mockDatabase.set(senderPsid, newHistory);
}

// 每次收到訊息時，建立一個帶有歷史紀錄的 Chat Session
async function createChatSessionWithHistory(senderPsid) {
  const history = await getHistoryFromDB(senderPsid);
  
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
    history: history.length > 0 ? history : undefined,
  });
}


// 1. Facebook Webhook 驗證路由 (GET)
app.get('/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. 接收 Facebook Messenger 訊息路由 (POST)
app.post('/webhook', async (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    // 必須馬上回覆 200 OK 給 Facebook，否則 Facebook 會重試發送
    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        let received_text = webhook_event.message.text;
        console.log(`收到來自 ${sender_psid} 的訊息: ${received_text}`);

        try {
          // 顯示「正在輸入...」狀態
          await sendTypingOn(sender_psid);

          // 1. 載入歷史紀錄並建立 Chat Session
          const chatSession = await createChatSessionWithHistory(senderPsid);
          
          // 2. 發送訊息給 Gemini
          const response = await chatSession.sendMessage({ message: received_text });
          const replyText = response.text;

          // 3. 將更新後的歷史紀錄存回 Database
          // chatSession.getHistory() 會返回包含最新對話的完整 Array
          const updatedHistory = await chatSession.getHistory();
          await saveHistoryToDB(senderPsid, updatedHistory);

          // 4. 將 Gemini 的回覆發送回 Facebook Messenger
          await callSendAPI(sender_psid, { text: replyText });

        } catch (error) {
          console.error("Gemini API 錯誤:", error);
          await callSendAPI(sender_psid, { text: "Yabai... 我個腦突然 short 咗 (API Error)，遲啲再傾啦！" });
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

// 輔助函數：發送訊息到 Facebook Send API
async function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_body)
    });
    if (!res.ok) {
      console.error("Facebook Send API 錯誤:", await res.text());
    }
  } catch (err) {
    console.error("無法連接 Facebook API:", err);
  }
}

// 輔助函數：顯示「正在輸入...」
async function sendTypingOn(sender_psid) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "sender_action": "typing_on"
  };
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request_body)
  });
}

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook 伺服器正在運行於 port ${PORT}`);
});
