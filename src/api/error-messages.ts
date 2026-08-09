import { ApiError } from './client';

/**
 * The API speaks stable English codes; the app owns the language.
 *
 * This is the whole reason the server never sends Georgian: one place decides
 * what a failure sounds like, and a new locale is a new file here rather than a
 * server release.
 */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'ელფოსტა ან პაროლი არასწორია',
  EMAIL_TAKEN: 'ამ ელფოსტით ანგარიში უკვე არსებობს',
  PASSWORD_TOO_SHORT: 'პაროლი უნდა იყოს მინიმუმ 10 სიმბოლო',
  PASSWORD_TOO_LONG: 'პაროლი ძალიან გრძელია',
  PASSWORD_TOO_COMMON: 'ეს პაროლი ძალიან გავრცელებულია — აირჩიე სხვა',
  VALIDATION_FAILED: 'შეამოწმე შეყვანილი მონაცემები',
  RATE_LIMITED: 'ბევრი მცდელობა იყო. სცადე ცოტა ხანში',
  UNAUTHORIZED: 'სესია ამოიწურა — გაიარე ავტორიზაცია',
  FORBIDDEN: 'ამის უფლება არ გაქვს',
  NOT_FOUND: 'ვერაფერი მოიძებნა',
  NETWORK_ERROR: 'კავშირი ვერ დამყარდა. შეამოწმე ინტერნეტი',
  TIMEOUT: 'სერვერი დიდხანს პასუხობს. სცადე ხელახლა',
  SERVICE_UNAVAILABLE: 'სერვისი დროებით მიუწვდომელია',
};

const FALLBACK = 'რაღაც შეიცვალა — სცადე ხელახლა';

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? FALLBACK;
  }
  return FALLBACK;
}
