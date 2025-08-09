export interface UserPublic { id: number; username: string; first_name?: string; last_name?: string }

export type MessageStatus = 'sent' | 'delivered' | 'seen'

export interface Message {
  id: number
  text: string
  created_at: string
  status: MessageStatus
  delivered_at?: string | null
  seen_at?: string | null
  sender: { id: number; username: string }
  receiver: { id: number; username: string }
}

/** WS inbound events */
export type WsInbound =
  | { type: 'message.new'; message: Message }
  | { type: 'receipt.update'; message_id: number; status: MessageStatus; ts?: string | null }
  | { type: 'receipt.bulk_seen'; items: { id: number; ts?: string }[] }
  | { type: 'typing'; from: string; active: boolean }

/** WS outbound events */
export type WsOutbound =
  | { type: 'message.send'; text: string }
  | { type: 'receipt.delivered'; message_id: number }
  | { type: 'receipt.seen_all' }
  | { type: 'typing.start' }
  | { type: 'typing.stop' }
