
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
  readAt?: Date;
}

export interface SendMessagePayload {
  senderId: string;
  recipientId: string;
  content: string;
}
