import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? 'bg-blue-100 ml-3' : 'bg-pink-100 mr-3'
        }`}>
          {isUser ? (
            <User size={20} className="text-blue-600" />
          ) : (
            <span className="text-xl" role="img" aria-label="girl">👧🏻</span>
          )}
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <span className="text-xs text-slate-500 mb-1 px-1">
            {isUser ? '你' : '阿光 (Hikari)'}
          </span>
          <div className={`relative px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
            isUser 
              ? 'bg-blue-500 text-white rounded-tr-sm' 
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
          }`}>
            
            {/* Render Image if exists */}
            {message.imageUrl && (
              <div className="mb-2">
                <img 
                  src={message.imageUrl} 
                  alt="Attachment" 
                  className="max-w-full rounded-lg shadow-sm border border-slate-200/50 max-h-64 object-contain bg-slate-50" 
                />
              </div>
            )}

            {/* Render Text */}
            {message.text && isUser && (
              <div className="whitespace-pre-wrap">{message.text}</div>
            )}
            
            {message.text && !isUser && (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown>{message.text}</ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-pink-400 animate-pulse align-middle"></span>
                )}
              </div>
            )}

            {/* Render streaming indicator if no text yet */}
            {!message.text && message.isStreaming && !isUser && (
               <span className="inline-block w-1.5 h-4 ml-1 bg-pink-400 animate-pulse align-middle"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
