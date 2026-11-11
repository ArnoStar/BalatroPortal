import { ItemCard } from '@/entities/item';
import type { Item } from '@/shared/api';
import { EmptyState } from '@/shared/ui';

/** the value of the picked items: each is worth its odds (1 in N drops: N) */
export const picked_value = (items: Item[], picked: string[]) =>
  items.filter((i) => picked.includes(i.id)).reduce((sum, i) => sum + i.odds, 0);

/** your items that can be staked (out of their trade hold, not staked elsewhere): pick up to `max` */
export function ItemPicker({ items, picked, onChange, max }: {
  items: Item[]; picked: string[]; onChange: (picked: string[]) => void; max: number;
}) {
  const stakable = items.filter((i) => i.tradable && i.odds > 0);
  const others = items.length - stakable.length;
  const toggle = (id: string) =>
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < max ? [...picked, id] : picked);
  return (
    <>
      {stakable.length ? (
        <ul className="item-grid item-grid--small">
          {stakable.map((i, n) => (
            <ItemCard key={i.id} item={i} index={n} selected={picked.includes(i.id)} onSelect={() => toggle(i.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="cards" title="You have no item to stake right now" />
      )}
      {others ? (
        <p className="muted">
          {others === 1 ? 'One of your items' : `${others} of your items`} can't be staked now: in their trade hold (a week
          after they change hands or are found), or already staked.
        </p>
      ) : null}
    </>
  );
}
