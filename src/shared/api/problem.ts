// The services' errors are RFC 9457 problem details with a stable `code`.
import { current_lang, N_, t } from '@/shared/i18n';

export interface Problem {
  status: number;
  code: string;
  detail: string;
  retry_after?: number;
  errors?: { loc: (string | number)[]; msg: string }[];
}

export class ProblemError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail);
    this.status = problem.status;
    this.code = problem.code;
    this.problem = problem;
  }
}

/** the response's JSON, or a ProblemError */
export async function read_json<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 202) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const p = body && typeof body === 'object' && 'code' in body ? (body as Problem) : null;
    throw new ProblemError(p ?? { status: res.status, code: 'http_error', detail: `the server answered ${res.status}` });
  }
  return body as T;
}

// The services' errors in a sentence each, by their stable code: in English the
// service's own words are shown (they say more); in another language, these
// (translated), or the service's words when the code isn't here.
const CODES: Record<string, string> = {
  // the identity service
  email_delivery_failed: N_('The email couldn’t be sent. Try again in a moment.'),
  email_not_verified: N_('Confirm your email first: enter the code we sent you.'),
  forbidden: N_('You can’t do that.'),
  invalid_code: N_('This code is wrong or has expired.'),
  invalid_credentials: N_('Wrong email or password.'),
  invalid_display_name: N_('This name can’t be used.'),
  invalid_email: N_('This email address isn’t valid.'),
  invalid_oauth_state: N_('The sign-in with Google didn’t go through. Try again.'),
  invalid_password: N_('This password is too weak.'),
  invalid_token: N_('Your session has ended: sign in again.'),
  last_admin: N_('There must be one admin at least.'),
  last_sign_in_method: N_('This is your only way to sign in: add another first.'),
  oauth_account_conflict: N_('This Google account belongs to another player.'),
  oauth_account_in_use: N_('This Google account is already linked to another account.'),
  oauth_account_not_found: N_('No account is linked to this Google account.'),
  oauth_email_not_verified: N_('Google hasn’t verified this email.'),
  oauth_exchange_failed: N_('Google didn’t answer. Try again.'),
  oauth_provider_disabled: N_('Sign-in with Google is off on this site.'),
  too_many_attempts: N_('Too many tries: wait a moment and try again.'),
  user_exists: N_('An account with this email already exists.'),
  user_not_found: N_('No account has this email.'),
  // every service
  unauthenticated: N_('Your session has ended: sign in again.'),
  auth_unavailable: N_('The sign-in service can’t be reached. Try again.'),
  invalid_request: N_('Some of this isn’t valid.'),
  http_error: N_('The server answered with an error. Try again.'),
  // the game API
  game_not_found: N_('This run or game doesn’t exist.'),
  player_not_found: N_('This player doesn’t exist (or hasn’t played yet).'),
  locked: N_('This isn’t unlocked yet.'),
  unlock_all_forbidden: N_('Only testers, developers and admins may unlock everything.'),
  // the item service
  item_not_found: N_('This item doesn’t exist.'),
  invalid_trade: N_('This offer can’t be made.'),
  not_owner: N_('One of these items isn’t theirs any more.'),
  item_locked: N_('One of these items is in its trade hold or staked in the casino.'),
  items_moved: N_('One of these items has changed hands since.'),
  trade_closed: N_('This offer is closed.'),
  trading_locked: N_('Trading opens after a first win (a counted run).'),
  not_allowed: N_('You can’t do that.'),
  too_many_offers: N_('You have as many open offers as you may: cancel one first.'),
  not_admin: N_('Only admins can do that.'),
  game_api_unavailable: N_('The game can’t be reached. Try again in a moment.'),
  // the social service
  already_friends: N_('You are friends already.'),
  cant_add: N_('This player can’t be added.'),
  cant_message: N_('You can’t write to this player.'),
  code_not_found: N_('No player has this friend code.'),
  conversation_not_found: N_('This conversation doesn’t exist.'),
  group_full: N_('This group is full.'),
  invalid_image: N_('This picture can’t be used: a PNG, JPEG or WebP image, small enough.'),
  invalid_message: N_('This message can’t be sent.'),
  not_friends: N_('You aren’t friends.'),
  request_closed: N_('This request has been answered.'),
  self: N_('That’s you.'),
  slow_down: N_('Slow down a little.'),
  too_many_friends: N_('Too many friends already.'),
  too_many_requests: N_('Too many requests: wait a while.'),
  // the bug report service
  report_not_found: N_('This report doesn’t exist.'),
  too_many_reports: N_('Too many reports: wait a while.'),
};

/** a message for the player, in their language */
export function describe(error: unknown): string {
  if (error instanceof ProblemError) {
    const field = error.problem.errors?.[0];
    if (error.code === 'invalid_request' && field) return `${field.loc.at(-1)}: ${field.msg}`;
    const own = error.message.charAt(0).toUpperCase() + error.message.slice(1) + '.';
    return current_lang() === 'en' || !CODES[error.code] ? own : t(CODES[error.code]);
  }
  if (error instanceof TypeError) return t('The server can’t be reached. Check your connection and try again.');
  return error instanceof Error ? error.message : String(error);
}
