// The site's pages for the player who is here: the sidebar and the search
// palette list the same ones.
import { useSession } from '@/entities/session';
import { items_api, reports_api } from '@/shared/api';
import { use_async } from '@/shared/lib';
import type { IconName } from '@/shared/ui';

export interface SiteLink {
  to: string;
  label: string;
  icon: IconName;
  /** a line about the page (the palette shows it and searches it) */
  hint: string;
  /** offers waiting ... */
  badge?: number;
  /** active only on this exact path */
  end?: boolean;
}

export interface LinkGroup {
  label: string;
  links: SiteLink[];
}

export function use_links(): LinkGroup[] {
  const { status, account } = useSession();
  const signed_in = status === 'signed-in';
  // the developers see the bug reports (the report service says who they are)
  const reports = use_async(() => (status === 'loading' ? Promise.resolve(null) : reports_api.me().catch(() => null)), [status]);
  // offers made to the player that wait for an answer
  const offers = use_async(
    () => (signed_in ? items_api.trades('incoming').then((t) => t.filter((x) => x.status === 'pending').length, () => 0) : Promise.resolve(0)),
    [signed_in],
  );

  const groups: LinkGroup[] = [
    {
      label: 'Explore',
      links: [
        { to: '/', label: 'Home', icon: 'home', hint: 'The front door, and your runs', end: true },
        { to: '/leaderboards', label: 'Leaderboards', icon: 'trophy', hint: 'Best hands, highest antes, wins' },
      ],
    },
  ];
  if (signed_in) {
    groups.push(
      {
        label: 'You',
        links: [
          { to: '/stats', label: 'Your stats', icon: 'chart', hint: 'Your runs in numbers' },
          { to: '/players/me', label: 'Your profile', icon: 'user', hint: 'What other players see' },
        ],
      },
      {
        label: 'Items',
        links: [
          { to: '/inventory', label: 'Your items', icon: 'cards', hint: 'Jokers and tags found by playing' },
          { to: '/trades', label: 'Trades', icon: 'swap', hint: 'Offers to you, and yours', badge: offers.data || undefined },
          { to: '/casino', label: 'Casino', icon: 'dice', hint: 'Coinflips and the jackpot' },
        ],
      },
    );
  }
  const staff: SiteLink[] = [];
  if (reports.data?.admin) staff.push({ to: '/bugs', label: 'Bug reports', icon: 'bug', hint: 'What players sent from the game' });
  if (account?.roles?.includes('admin')) staff.push({ to: '/admin', label: 'Accounts', icon: 'shield', hint: 'Accounts and their roles' });
  if (staff.length) groups.push({ label: 'Staff', links: staff });
  return groups;
}
