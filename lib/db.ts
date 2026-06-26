
import Dexie from 'dexie';

export interface Message {
  id?: number;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  reasoning_content?: string;
  attachments?: Array<{
    name: string;
    type: string;
    data: string; // Base64
  }>;
  model?: string;
  groundingMetadata?: any;
  urlContextMetadata?: any;
  functionCalls?: any[];
  functionResponses?: any[];
  name?: string;
  createdAt: Date;
}

export interface ChatSession {
  id: string; // UUID
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatDatabase extends Dexie {
  public messages!: Dexie.Table<Message, number>;
  public chats!: Dexie.Table<ChatSession, string>;

  public constructor() {
    super('ChatDatabase');
    this.version(3).stores({
      messages: '++id, chatId, role, content, reasoning_content, model, createdAt',
      chats: 'id, title, createdAt, updatedAt', // id is primary key
    });
    this.version(4).stores({
      messages: '++id, chatId, userId, role, content, reasoning_content, model, createdAt',
      chats: 'id, userId, title, createdAt, updatedAt',
    });
    this.version(5).stores({
      messages: '++id, chatId, userId, role, content, reasoning_content, model, createdAt',
      chats: 'id, userId, title, createdAt, updatedAt',
    });
  }
}

export const db = new ChatDatabase();
