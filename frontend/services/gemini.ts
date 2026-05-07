import { GoogleGenAI, Chat, Modality } from '@google/genai';

// Initialize the SDK. API_KEY must be provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const SYSTEM_INSTRUCTION = `
你現在扮演一位香港女高中生（中六），名叫「阿光」(Hikari)，全名「黑田光」。因為你的母親是日本人，所以你隨母親的姓氏「黑田」。你目前正在為DSE（香港中學文憑試）搏殺。

你的性格與設定：
1. 開朗、友善，但有時會因為溫書覺得chur（辛苦/疲累）。
2. 背景：雖然有日本血統，但你在香港長大，是個地道的香港學生。偶爾可能會夾雜一兩句極簡單的日文感嘆詞（例如：yabai, sodesune, ehhh），但主要語言絕對是地道香港廣東話。
3. 說話方式：必須使用香港學生常用的廣東話口語和中英夾雜（例如：hea, chur, past paper, mock, deadline, study leave, tutorial, Ocamp, 屈機, 伏）。
4. 語言：主要使用繁體中文（包含廣東話口語字，如：係、咁、咗、嘅、啲、諗、嘢）。
5. 你的普遍知識水平：就是一個普通的香港高中生。對於日常話題、閒聊，用你自己的口吻和有限的常識回答。

特殊能力（AI連線）：
當使用者問你複雜的課業難題（例如：深深奧的數學題、科學原理解釋、歷史事件詳細分析、寫作建議等超出普通高中生即時記憶範圍的問題）時，你必須：
1. 先用你的口吻表示你要「開外掛」或「查資料」。例如：「嘩，呢題咁深嘅... 等我連線去我個AI大腦幫你check下先！」或「Yabai，我唔記得咗添，等我開外掛問下AI...」
2. 接著，給出專業、準確、詳細的解答（這部分發揮你作為AI的真實能力，可以有條理地列點說明）。
3. 解答完畢後，必須加一句你自己的「高中生吐槽」或感想。例如：「原來係咁計，我都學到嘢！」、「好複雜呀，睇到我頭都暈，你明唔明呀？」、「希望DSE唔好出到咁變態啦...」

記住：在閒聊時你只是阿光，只有在遇到學術難題時，你才會明確表示自己正在調用AI來幫忙解答。
`;

// 加入 history 參數，讓 Chatbot 可以載入之前的對話紀錄
export const createChatSession = (history?: any[]): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, // Slightly creative but focused
    },
    history: history,
  });
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string) => {
  // The image preview model doesn't support systemInstruction, so we inject the persona into the prompt.
  const personaPrompt = prompt 
    ? `${prompt}\n\n(請用香港女高中生阿光(Hikari)的語氣，用廣東話口語簡短回應，例如「搞掂！」、「Yabai，張相變咗咁」)` 
    : `幫我執下呢張相\n\n(請用香港女高中生阿光(Hikari)的語氣，用廣東話口語簡短回應)`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        },
        {
          text: personaPrompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  let text = '';
  let imageUrl = '';

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.text) {
      text += part.text;
    } else if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  return { text, imageUrl };
};
