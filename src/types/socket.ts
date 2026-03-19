import { IMessage } from "./index";

export interface ServerToClientEvents {
  "new message": (message: IMessage) => void;
  "read message": (data: { conversationId: string; userId: string }) => void;
  "online users": (users: string[]) => void;
}

export interface ClientToServerEvents {
  "join conversation": (conversationId: string) => void;
  typing: (conversationId: string) => void;
}

export interface SocketData {
  user: {
    _id: string;
    username: string;
  };
}
