export interface RoomMembership {
  groupId: string
  name: string
  passphrase: string
  inviteCode: string
  joinedAt: number
}

export interface UserRooms {
  rooms: RoomMembership[]
  mainRoomId: string
}

// 合言葉から SHA-256 ハッシュを計算し、そのままグループIDとして使う
// （平文の合言葉は groups/{groupId} 側にはどこにも保存・送信しない。正しい合言葉を
//   知っている人だけが対応するグループのドキュメントパスを導出できる、という単純な仕組み。
//   招待コードは groupId への単なる目印であり、合言葉の代わりにはならない）
export async function hashPassphrase(passphrase: string): Promise<string> {
  const normalized = passphrase.trim()
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// 0/O, 1/I など見間違えやすい文字を除いた英数字で招待コードを生成する
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)]
  }
  return code
}
