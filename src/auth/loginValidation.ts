export function validateLoginInput(email: string, password: string): string | null {
  if (!email.trim()) return 'Enter your administrator email.'
  if (!email.includes('@')) return 'Enter a valid email address.'
  if (!password) return 'Enter your password.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  return null
}
