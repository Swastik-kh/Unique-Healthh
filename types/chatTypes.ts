
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  members: string[]; // Array of user IDs
  lastMessage?: string;
  lastMessageTime?: number;
}
