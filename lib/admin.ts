export const ADMIN_EMAILS = [
  "munjidvh@gmail.com",
  "abhishekmraj06@gmail.com",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}