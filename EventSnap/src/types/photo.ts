export type EventPhoto = {
  id: string;
  event_id: string;
  user_id: string;
  storage_path: string;
  created_at: string;
  photo_url: string;
  reactions: string[];
  author?: {
    username: string;
    avatar_url: string | null;
  };
};
