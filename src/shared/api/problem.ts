// The services' errors are RFC 9457 problem details with a stable `code`.

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

/** a message for the player */
export function describe(error: unknown): string {
  if (error instanceof ProblemError) {
    const field = error.problem.errors?.[0];
    if (error.code === 'invalid_request' && field) return `${field.loc.at(-1)}: ${field.msg}`;
    return error.message.charAt(0).toUpperCase() + error.message.slice(1) + '.';
  }
  if (error instanceof TypeError) return 'The server can\'t be reached. Check your connection and try again.';
  return error instanceof Error ? error.message : String(error);
}
