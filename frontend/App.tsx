import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, BookOpen, Loader2, AlertCircle, Image as ImageIcon, X, Trash2, Share2 } from 'lucide-react';
import { Chat } from '@google/genai';
import { createChatSession, editImage } from './services/gemini';
import { Message } from './types';
import { ChatMessage } from './components/ChatMessage';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const LOCAL_STORAGE_KEY = 'hikari_chat_history';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize chat session and load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      
      if (savedHistory) {
        const parsedMessages = JSON.parse(savedHistory) as Message[];
        setMessages(parsedMessages);
        
        // Convert saved messages to Gemini history format
        const geminiHistory = parsedMessages
          .filter(msg => !msg.isStreaming && msg.text) // Only include completed text messages
          .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
          }));
          
        chatRef.current = createChatSession(geminiHistory.length > 0 ? geminiHistory : undefined);
      } else {
        chatRef.current = createChatSession();
        setMessages([
          {
            id: 'init-1',
            role: 'model',
            text: '哈囉！我係阿光 👋🏻 啱啱溫完一轉 physics，攰到傻... 你搵我有咩事呀？係咪有功課唔識做？定係想搵我幫你改相呀？'
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to initialize chat:", err);
      setError("無法連線到阿光的大腦 (API 初始化失敗)。請確保環境變數已設定。");
    }
  }, []);

  // Save messages to localStorage whenever they change (and are not streaming)
  useEffect(() => {
    if (messages.length > 0 && !messages.some(msg => msg.isStreaming)) {
      // To prevent localStorage quota exceeded, we might want to strip large base64 images before saving
      const messagesToSave = messages.map(msg => {
        if (msg.imageUrl && msg.imageUrl.startsWith('data:image')) {
          return { ...msg, imageUrl: undefined, text: msg.text || '[圖片已省略]' };
        }
        return msg;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messagesToSave));
    }
  }, [messages]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  const handleInputResize = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearHistory = () => {
    if (window.confirm('確定要清除所有對話紀錄？阿光會忘記之前同你傾過嘅嘢㗎！')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setMessages([
        {
          id: 'init-1',
          role: 'model',
          text: '哈囉！我係阿光 👋🏻 啱啱溫完一轉 physics，攰到傻... 你搵我有咩事呀？係咪有功課唔識做？定係想搵我幫你改相呀？'
        }
      ]);
      chatRef.current = createChatSession(); // Reset session
    }
  };

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if ((!trimmedInput && !selectedFile) || !chatRef.current || isTyping) return;

    const newUserMsgId = Date.now().toString();
    const newModelMsgId = (Date.now() + 1).toString();

    const currentInput = trimmedInput;
    const currentFile = selectedFile;
    const currentPreviewUrl = previewUrl;

    // Add user message
    setMessages(prev => [...prev, { 
      id: newUserMsgId, 
      role: 'user', 
      text: currentInput,
      imageUrl: currentPreviewUrl || undefined
    }]);
    
    setInputValue('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsTyping(true);
    setError(null);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      if (currentFile) {
        // Image Edit Mode
        setMessages(prev => [...prev, { id: newModelMsgId, role: 'model', text: '等我開外掛幫你搞搞張相先... 📸', isStreaming: true }]);
        
        const base64Data = await fileToBase64(currentFile);
        const result = await editImage(base64Data, currentFile.type, currentInput);
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newModelMsgId 
              ? { ...msg, text: result.text || '搞掂！你睇下滿唔滿意？', imageUrl: result.imageUrl, isStreaming: false } 
              : msg
          )
        );
      } else {
        // Normal Chat Mode
        setMessages(prev => [...prev, { id: newModelMsgId, role: 'model', text: '', isStreaming: true }]);
        const responseStream = await chatRef.current.sendMessageStream({ message: currentInput });
        
        let fullText = '';
        for await (const chunk of responseStream) {
          if (chunk.text) {
            fullText += chunk.text;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === newModelMsgId 
                  ? { ...msg, text: fullText } 
                  : msg
              )
            );
          }
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newModelMsgId 
              ? { ...msg, isStreaming: false } 
              : msg
          )
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("阿光突然斷咗線... 可能係溫書溫到瞓著咗，或者網絡有問題。");
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.id === newModelMsgId && lastMsg.text === '') {
          return prev.slice(0, -1);
        }
        return prev.map(msg => msg.id === newModelMsgId ? { ...msg, isStreaming: false, text: msg.text + "\n\n*(連線中斷)*" } : msg);
      });
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [inputValue, isTyping, selectedFile, previewUrl]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-white shadow-xl sm:border-x sm:border-slate-200 relative">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-pink-50 border-b border-pink-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border-2 border-pink-200">
              👧🏻
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              黑田光 (Hikari) <BookOpen size={16} className="text-pink-500" />
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              中六 DSE 戰士 📚 | <span className="flex items-center gap-1 text-green-600 font-medium"><span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span> Online</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
            title="分享畀朋友"
          >
            <Share2 size={18} />
          </button>
          <button 
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="清除對話紀錄"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-md flex items-start gap-3 shrink-0">
          <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-20 rounded-md border border-slate-200 shadow-sm object-cover" />
            <button 
              onClick={clearSelectedFile}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors shadow-sm"
              title="移除相片"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-slate-100 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-pink-200 transition-all">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-pink-500 transition-colors mb-0.5"
            disabled={isTyping}
            title="上傳相片俾阿光改"
          >
            <ImageIcon size={22} />
          </button>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleInputResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "輸入你想點樣改張相..." : "同阿光傾下偈，或者問佢功課..."}
            className="flex-1 max-h-[120px] min-h-[40px] bg-transparent border-none focus:ring-0 resize-none py-2 px-1 text-slate-700 placeholder-slate-400 text-[15px]"
            rows={1}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !selectedFile) || isTyping}
            className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
              (inputValue.trim() || selectedFile) && !isTyping
                ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">
            阿光可能會用 AI 幫手解答複雜問題或修改相片。
          </span>
        </div>
      </footer>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Share2 className="text-blue-500" /> 點樣分享畀朋友玩？
            </h2>
            
            <div className="space-y-4 text-sm text-slate-600">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800">
                <p className="font-bold flex items-center gap-1 mb-1">
                  <AlertCircle size={16} /> ⚠️ 安全警告
                </p>
                <p>呢個 App 目前直接連住你嘅 <strong>Gemini API Key</strong>。如果你直接將而家嘅網址 (URL) 或者原始碼公開，其他人可能會盜用你嘅 API Key，導致你被扣錢或爆 Quota！</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-1">✅ 安全分享方法 1：面對面玩</h3>
                <p>最簡單安全嘅方法，就係直接攞你部手機或者電腦，開住個畫面畀朋友親自試玩。</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-1">✅ 安全分享方法 2：部署到 Vercel (適合進階用家)</h3>
                <p>如果你想畀條 Link 朋友自己喺屋企玩，你需要將程式碼部署到 Vercel 或 Netlify 等平台，並將 API Key 設定為伺服器環境變數 (Environment Variables)。</p>
                <p className="mt-1 text-xs text-slate-500">👉 詳細步驟請打開專案入面嘅 <code className="bg-slate-100 px-1 py-0.5 rounded">README.md</code> 檔案查看。</p>
              </div>
              
              <div>
                <h3 className="font-bold text-slate-800 mb-1">✅ 安全分享方法 3：接入 Facebook Messenger</h3>
                <p>你可以建立一個 Node.js 後端伺服器，將阿光變成一個 Facebook 專頁嘅 Chatbot！</p>
                <p className="mt-1 text-xs text-slate-500">👉 參考專案入面嘅 <code className="bg-slate-100 px-1 py-0.5 rounded">backend-example/server.js</code> 檔案。</p>
              </div>
            </div>

            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="mt-6 w-full bg-slate-800 text-white py-2.5 rounded-xl font-medium hover:bg-slate-700 transition-colors"
            >
              明白！
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
