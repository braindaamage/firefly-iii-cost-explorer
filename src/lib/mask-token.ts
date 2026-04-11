const MASK_CHAR = '•'
const MASK_LENGTH = 8
const VISIBLE_SUFFIX_LENGTH = 4

export function maskToken(token: string): string {
  if (token.length <= VISIBLE_SUFFIX_LENGTH) {
    return MASK_CHAR.repeat(MASK_LENGTH)
  }
  return MASK_CHAR.repeat(MASK_LENGTH) + token.slice(-VISIBLE_SUFFIX_LENGTH)
}
