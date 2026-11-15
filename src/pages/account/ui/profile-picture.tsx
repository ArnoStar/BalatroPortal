// The player's profile picture (the social service keeps it: friends, requests
// and the chat show it). The image is cut square and made 256 x 256 here, in
// the browser, before it is sent.
import { useRef, useState, type ChangeEvent } from 'react';
import { useSession } from '@/entities/session';
import { useSocial } from '@/entities/social';
import { avatar_url, describe, social_api } from '@/shared/api';
import { Alert, Avatar, Button, Icon } from '@/shared/ui';

const SIZE = 256;

/** the middle square of an image, SIZE x SIZE, as WebP (JPEG where the browser can't make WebP) */
async function square(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('this browser can’t draw the picture');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const as = (type: string, quality: number) => new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality));
  const webp = await as('image/webp', 0.88);
  const blob = webp?.type === 'image/webp' ? webp : await as('image/jpeg', 0.9);
  if (!blob) throw new Error('the picture couldn’t be made');
  return blob;
}

export function ProfilePicture() {
  const { account } = useSession();
  const social = useSocial();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  if (!account) return null;
  const src = avatar_url(account.id, social.me?.avatar);

  async function chosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('upload');
    setError(null);
    setDone(null);
    try {
      social.apply({ type: 'me', data: await social_api.set_avatar(await square(file)) });
      setDone('Your new picture is on.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('remove');
    setError(null);
    setDone(null);
    try {
      social.apply({ type: 'me', data: await social_api.remove_avatar() });
      setDone('Your initials are back.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="picture-form">
      <Avatar name={account.display_name} src={src} size="xl" />
      <div className="stack stack--tight">
        <p className="muted">Your friends see it next to your name, in their lists and in the chat. A photo or an image of yours: it is cut square.</p>
        <div className="row">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="visually-hidden" onChange={chosen} id="picture-file" />
          <Button busy={busy === 'upload'} disabled={!social.me} onClick={() => input.current?.click()} icon={<Icon name="image" />}>
            {src ? 'Change it' : 'Choose a picture'}
          </Button>
          {src ? (
            <Button tone="ghost" busy={busy === 'remove'} onClick={remove} icon={<Icon name="trash" />}>
              Remove it
            </Button>
          ) : null}
        </div>
        {done ? <Alert tone="success">{done}</Alert> : null}
        {error ? <Alert>{describe(error)}</Alert> : null}
        {!social.me && social.error ? <Alert tone="info">The friends service can&rsquo;t be reached right now.</Alert> : null}
      </div>
    </div>
  );
}
