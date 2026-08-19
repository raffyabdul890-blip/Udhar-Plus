"use client";

import { useEffect, useState } from "react";
import { getPhoto } from "@/lib/db/offlineStorage";

export default function EntryPhotoThumbnail({ photoId }: { photoId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    getPhoto(photoId).then((photo) => {
      if (cancelled || !photo) return;
      objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, next/image can't optimize it
    <img
      src={url}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg border border-brand-charcoal object-cover"
    />
  );
}
