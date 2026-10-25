// The bug report service (BalatroBugReportService): the developers' side
// (players send reports from inside the game).
import { REPORTS_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type ReportStatus = 'open' | 'closed';

export interface ReportItem {
  id: string;
  created_at: string;
  updated_at: string;
  reporter: string;
  reporter_name: string | null;
  description: string;
  status: ReportStatus;
  game_id: string | null;
  game_version: number | null;
  has_screenshot: boolean;
  has_history: boolean;
  errors: number;
}

export interface RecordedEvent {
  t: number;
  k: string;
  [key: string]: unknown;
}

export interface Report extends Omit<ReportItem, 'has_screenshot' | 'has_history' | 'errors'> {
  notes: string;
  history: { id: string; version: number; engine_version: string; settings: Record<string, unknown>; commands: Record<string, unknown>[] } | null;
  client: Record<string, unknown>;
  recording: {
    format?: number;
    t?: number;
    dropped?: number;
    events?: RecordedEvent[];
    errors?: { t: number; message: string; stack?: string; source: string }[];
  };
  screenshot_url: string | null;
}

const url = (path: string) => `${REPORTS_BASE}${path}`;
const json = { 'content-type': 'application/json' };

export const reports_api = {
  me: () => authorized_fetch(url('/v1/me')).then((r) => read_json<{ id: string; name: string | null; admin: boolean }>(r)),
  list: (status?: ReportStatus) =>
    authorized_fetch(url(`/v1/reports?limit=200${status ? `&status=${status}` : ''}`)).then((r) => read_json<ReportItem[]>(r)),
  get: (id: string) => authorized_fetch(url(`/v1/reports/${encodeURIComponent(id)}`)).then((r) => read_json<Report>(r)),
  triage: (id: string, change: { status?: ReportStatus; notes?: string }) =>
    authorized_fetch(url(`/v1/reports/${encodeURIComponent(id)}`), { method: 'PATCH', headers: json, body: JSON.stringify(change) })
      .then((r) => read_json<Report>(r)),
  /** the screenshot as an object URL (it needs the access token, so no plain <img src>) */
  screenshot: async (id: string) => {
    const res = await authorized_fetch(url(`/v1/reports/${encodeURIComponent(id)}/screenshot`));
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  },
};
