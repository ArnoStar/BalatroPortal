import type { CSSProperties } from 'react';
import { GAME_URL } from '@/shared/config';
import { AnchorButton, Icon, LinkButton } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <div className="lost">
      <div className="lost__cards" aria-hidden>
        <span className="lost__card" style={{ '--i': 0 } as CSSProperties}>
          4
        </span>
        <span className="lost__card lost__card--wild" style={{ '--i': 1 } as CSSProperties}>
          <Icon name="sparkle" />
        </span>
        <span className="lost__card" style={{ '--i': 2 } as CSSProperties}>
          4
        </span>
      </div>
      <h1 className="page-title">Nothing here</h1>
      <p>This page doesn't exist: it isn't in the deck.</p>
      <div className="row">
        <LinkButton to="/" icon={<Icon name="home" />} viewTransition>
          Home
        </LinkButton>
        <AnchorButton tone="grey" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
          Play
        </AnchorButton>
      </div>
    </div>
  );
}
