export interface PlatformMessage {
  id: string
  platform: string
  botId: string
  guildId?: string
  channelId?: string
  userId?: string
  content?: string
  timestamp?: number
}
