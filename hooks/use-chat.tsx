
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Message, ChatSession } from '@/lib/db';
import { useAuth } from './use-auth';

interface ChatContextType {
  // Session Management
  chats: ChatSession[] | undefined;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createChat: () => Promise<string>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, newTitle: string) => Promise<void>;

  // Message Management
  messages: Message[] | undefined;
  addMessage: (message: Omit<Message, 'id' | 'createdAt' | 'chatId' | 'userId'>) => Promise<number>;
  updateMessage: (id: number, updates: Partial<Pick<Message, 'content' | 'reasoning_content' | 'attachments' | 'groundingMetadata' | 'urlContextMetadata' | 'functionCalls'>>) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;

  // Data Management
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentChatId, _setCurrentChatId] = useState<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('omnichat_current_chat_id');
    if (savedId) {
      _setCurrentChatId(savedId);
      currentChatIdRef.current = savedId;
    }
  }, []);

  const setCurrentChatId = useCallback((id: string | null) => {
    currentChatIdRef.current = id;
    _setCurrentChatId(id);

    if (id) {
      localStorage.setItem('omnichat_current_chat_id', id);
    } else {
      localStorage.removeItem('omnichat_current_chat_id');
    }
  }, []);

  // Load all chats for current user sorted by updatedAt desc
  const chats = useLiveQuery(
    async () => {
      if (!user) return [];
      return await db.chats.where('userId').equals(user.id).reverse().sortBy('updatedAt');
    },
    [user]
  );

  // Load messages for current chat
  const messages = useLiveQuery(
    () => {
      if (!currentChatId) return [];
      return db.messages.where('chatId').equals(currentChatId).sortBy('createdAt');
    },
    [currentChatId]
  );

  // Initialize a chat if none exists or ensure we have a valid state
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      // Migration: If we have no chats but have legacy 'global' messages, wrap them in a session
      // Check if any chat exists for THIS user
      const count = await db.chats.where('userId').equals(user.id).count();
      if (count === 0) {
        // Check for legacy messages with NO userId or 'global' chatId
        // Actually earlier schema didn't have userId. So existing messages have userId=undefined (or missing).
        // Dexie might index them if we upgrade, but existing objects might not have the field.
        // Let's assume we maintain the 'global' check.
        const legacyCount = await db.messages.where('chatId').equals('global').count();
        if (legacyCount > 0) {
          // We found legacy messages. Assign them to this user?
          // This is tricky if multiple users use the same browser. 
          // But since we defaulted one user, let's claim them for the current user.
          await db.chats.add({
            id: 'global',
            userId: user.id,
            title: 'Previous Conversation',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          // Also update messages to have userId
          await db.messages.where('chatId').equals('global').modify({ userId: user.id });
        }
      }
    };
    init();
  }, [user]);

  const createChat = useCallback(async () => {
    if (!user) return "";
    const id = crypto.randomUUID();
    const newChat: ChatSession = {
      id,
      userId: user.id,
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.chats.add(newChat);
    setCurrentChatId(id);
    return id;
  }, [user]);

  const deleteChat = useCallback(async (id: string) => {
    await db.transaction('rw', db.chats, db.messages, async () => {
      await db.chats.delete(id);
      await db.messages.where('chatId').equals(id).delete();
    });
    if (currentChatId === id) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  const renameChat = useCallback(async (id: string, newTitle: string) => {
    await db.chats.update(id, { title: newTitle, updatedAt: new Date() });
  }, []);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'createdAt' | 'chatId' | 'userId'>) => {
    if (!user) return -1;
    let targetChatId = currentChatIdRef.current;

    if (!targetChatId) {
      // If no chat is selected, create a new one automatically
      targetChatId = await createChat();
    }

    // Auto-title generation could happen here in background, but for now just update timestamp
    await db.chats.update(targetChatId, { updatedAt: new Date() });

    // Update title if it's the first user message and title is "New Chat"
    if (message.role === 'user') {
      const chat = await db.chats.get(targetChatId);
      if (chat && chat.title === 'New Chat') {
        // Simple truncation for title
        const newTitle = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
        await db.chats.update(targetChatId, { title: newTitle });
      }
    }

    const messageWithUser = {
      ...message,
      chatId: targetChatId,
      userId: user.id,
      createdAt: new Date(),
    } as Message;

    const id = await db.messages.add(messageWithUser);

    return id;
  }, [createChat, user]);

  const updateMessage = useCallback(async (id: number, updates: Partial<Pick<Message, 'content' | 'reasoning_content' | 'attachments' | 'groundingMetadata' | 'urlContextMetadata' | 'functionCalls'>>) => {
    await db.messages.update(id, updates);
  }, []);

  const deleteMessage = useCallback(async (id: number) => {
    await db.messages.delete(id);
  }, []);

  const exportData = useCallback(async () => {
    if (!user) return "{}";
    const allChats = await db.chats.where('userId').equals(user.id).toArray();
    // Get messages for these chats
    const chatIds = allChats.map(c => c.id);
    const allMessages = await db.messages.where('chatId').anyOf(chatIds).toArray();
    return JSON.stringify({ chats: allChats, messages: allMessages }, null, 2);
  }, [user]);

  const importData = useCallback(async (jsonData: string) => {
    if (!user) return;
    try {
      const data = JSON.parse(jsonData);
      if (!data.chats || !data.messages) throw new Error("Invalid data format");

      await db.transaction('rw', db.chats, db.messages, async () => {
        // Clear only for current user
        await db.chats.where('userId').equals(user.id).delete();
        await db.messages.where('userId').equals(user.id).delete();

        // Fix dates from JSON strings and ensure userId matches current user
        const chats = data.chats.map((c: any) => ({
          ...c,
          userId: user.id, // Override imported userId with current user
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }));
        const messages = data.messages.map((m: any) => ({
          ...m,
          userId: user.id, // Override
          createdAt: new Date(m.createdAt)
        }));

        await db.chats.bulkAdd(chats);
        await db.messages.bulkAdd(messages);
      });
      // Reset current chat
      setCurrentChatId(null);
    } catch (e) {
      console.error("Import failed:", e);
      throw e;
    }
  }, [user]);

  const clearAllData = useCallback(async () => {
    if (!user) return;
    await db.transaction('rw', db.chats, db.messages, async () => {
      // Only delete for current user
      await db.chats.where('userId').equals(user.id).delete();
      await db.messages.where('userId').equals(user.id).delete();
    });
    setCurrentChatId(null);
  }, [user]);

  return (
    <ChatContext.Provider value={{
      chats,
      currentChatId,
      setCurrentChatId,
      createChat,
      deleteChat,
      renameChat,
      messages,
      addMessage,
      updateMessage,
      deleteMessage,
      exportData,
      importData,
      clearAllData
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
