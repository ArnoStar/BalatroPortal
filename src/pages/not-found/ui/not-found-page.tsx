import { LinkButton, Panel } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <Panel title="Nothing here" narrow>
      <p>This page doesn't exist.</p>
      <LinkButton to="/">Home</LinkButton>
    </Panel>
  );
}
