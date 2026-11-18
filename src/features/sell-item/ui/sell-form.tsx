// Selling an item on the market: its price, with what it is worth (its odds,
// the casino's value) and what the same card sold for lately.
import { useState, type FormEvent } from 'react';
import { describe, items_api, type Item, type Listing } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Coins, Field, Icon } from '@/shared/ui';
import { fmt_ago, fmt_number, t } from '@/shared/i18n';

const MAX_PRICE = 1_000_000_000;

export function SellForm({ item, onSold }: { item: Item; onSold: (listing: Listing) => void }) {
  const sales = use_async(() => items_api.sales(item.variant, item.edition, 5), [item.variant, item.edition]);
  const [price, setPrice] = useState(String(Math.max(1, item.value || 1)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const n = Number(price);
  const valid = Number.isInteger(n) && n >= 1 && n <= MAX_PRICE;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      onSold(await items_api.sell(item.id, n));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="sell-form" onSubmit={submit}>
      <Field
        label={t('Price, in coins')}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_PRICE}
        step={1}
        required
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        hint={t('Another player buys it at once, at this price. Until then you may take it off the market.')}
      />
      <dl className="sell-form__facts">
        <div>
          <dt>{t('Its value (its card, upgrades and condition)')}</dt>
          <dd>
            <Coins value={item.value} size="sm" />
          </dd>
        </div>
        <div>
          <dt>{t('Sold lately (the same card and edition)')}</dt>
          <dd>
            {sales.data?.length ? (
              <ul className="sell-form__sales">
                {sales.data.map((s) => (
                  <li key={s.id}>
                    <Coins value={s.price} size="sm" /> <span className="muted">{fmt_ago(s.updated_at)}</span>
                  </li>
                ))}
              </ul>
            ) : sales.data ? (
              <span className="muted">{t('Never yet')}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {error ? <Alert>{describe(error)}</Alert> : null}
      <Button type="submit" busy={busy} disabled={!valid} icon={<Icon name="scale" />}>
        {valid ? t('Sell it for {n} coins', { n: fmt_number(n) }) : t('Sell it')}
      </Button>
    </form>
  );
}
