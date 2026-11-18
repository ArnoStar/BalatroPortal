// The site's pages for the player who is here: the sidebar and the search
// palette list the same ones.
import { useSession } from '@/entities/session';
import { useSocial } from '@/entities/social';
import { items_api, reports_api } from '@/shared/api';
import { CASINO_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import type { IconName } from '@/shared/ui';
import { t } from '@/shared/i18n';

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
  /** another app of the site (the casino): a full page load */
  external?: boolean;
}

export interface LinkGroup {
  label: string;
  links: SiteLink[];
}

export function use_links(): LinkGroup[] {
  const { status, account } = useSession();
  const social = useSocial();
  const signed_in = status === 'signed-in';
  // the developers see the bug reports (the report service says who they are)
  const reports = use_async(() => (status === 'loading' ? Promise.resolve(null) : reports_api.me().catch(() => null)), [status]);
  // offers made to the player that wait for an answer
  const offers = use_async(
    () => (signed_in ? items_api.trades('incoming').then((list) => list.filter((x) => x.status === 'pending').length, () => 0) : Promise.resolve(0)),
    [signed_in],
  );
  // packs bought and not opened yet
  const packs = use_async(() => (signed_in ? items_api.me().then((m) => m.packs, () => 0) : Promise.resolve(0)), [signed_in]);

  const groups: LinkGroup[] = [
    {
      label: t('Explore'),
      links: [
        { to: '/', label: t('Home'), icon: 'home', hint: t('The front door, and your runs'), end: true },
        { to: '/leaderboards', label: t('Leaderboards'), icon: 'trophy', hint: t('Best hands, highest antes, wins') },
      ],
    },
  ];
  if (signed_in) {
    groups.push(
      {
        label: t('You'),
        links: [
          { to: '/stats', label: t('Your stats'), icon: 'chart', hint: t('Your runs in numbers') },
          { to: '/players/me', label: t('Your profile'), icon: 'user', hint: t('What other players see') },
        ],
      },
      {
        label: t('Social'),
        links: [
          { to: '/friends', label: t('Friends'), icon: 'users', hint: t('Who is online, requests, invite links'), badge: social.incoming.length || undefined },
          { to: '/chat', label: t('Chat'), icon: 'chat', hint: t('Your friends and groups; share runs and seeds'), badge: social.unread || undefined },
        ],
      },
      {
        label: t('Items'),
        links: [
          { to: '/inventory', label: t('Your items'), icon: 'cards', hint: t('Your cards, and the coins your runs earn') },
          { to: '/shop', label: t('Shop'), icon: 'gift', hint: t('Boosters: packs of cards to choose from, for coins'), badge: packs.data || undefined },
          { to: '/market', label: t('Market'), icon: 'scale', hint: t('Items players sell, for coins') },
          { to: '/trades', label: t('Trades'), icon: 'swap', hint: t('Offers to you, and yours'), badge: offers.data || undefined },
          { to: `${CASINO_URL}/`, label: t('Casino'), icon: 'dice', hint: t('Coinflips, dice and the jackpot, live'), external: true },
        ],
      },
    );
  }
  const staff: SiteLink[] = [];
  if (reports.data?.admin) staff.push({ to: '/bugs', label: t('Bug reports'), icon: 'bug', hint: t('What players sent from the game') });
  if (account?.roles?.includes('admin')) staff.push({ to: '/admin', label: t('Accounts'), icon: 'shield', hint: t('Accounts and their roles') });
  if (staff.length) groups.push({ label: t('Staff'), links: staff });
  return groups;
}
