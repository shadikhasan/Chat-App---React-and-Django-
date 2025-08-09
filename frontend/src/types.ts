export interface UserPublic { id: number; username: string; first_name?: string; last_name?: string }
export interface Message { id: number; text: string; created_at: string; sender: { id: number; username: string }; receiver: { id: number; username: string } }
export interface Me { id: number; username: string; email: string; first_name?: string; last_name?: string }
