export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  status: PresenceStatus;
  lastActiveAt: string; // ISO-8601 string
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface Connection {
  id: string;
  senderId: string; // User ID who initiated the connection request
  recipientId: string; // User ID who received the connection request
  status: ConnectionStatus;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
