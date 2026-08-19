"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import { getPhoto } from "@/lib/db/offlineStorage";

export default function PhotoAttachment({
  file,
  existingPhotoId,
  onFileSelected,
  onRemove,
}: {
  file: File | null;
  existingPhotoId?: string;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}) {
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store, loaded async via getPhoto
    // below) — the textbook valid effect use case, just one the new lint rule
    // can't tell apart from deriving state.
    if (file || !existingPhotoId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExistingPreviewUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    getPhoto(existingPhotoId).then((photo) => {
      if (cancelled || !photo) return;
      objectUrl = URL.createObjectURL(photo.blob);
      setExistingPreviewUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, existingPhotoId]);

  const newFilePreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (newFilePreviewUrl) URL.revokeObjectURL(newFilePreviewUrl);
    };
  }, [newFilePreviewUrl]);

  const previewUrl = newFilePreviewUrl ?? existingPreviewUrl;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-senior-base font-medium text-ink">Photo (optional)</span>

      {previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, next/image can't optimize it */}
          <img
            src={previewUrl}
            alt="Attached receipt"
            className="h-16 w-16 rounded-lg border border-border object-cover"
          />
          <Button variant="secondary" size="sm" onClick={onRemove}>
            Remove photo
          </Button>
        </div>
      ) : (
        <label className="flex min-h-tap w-fit cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-alt px-4 text-senior-sm font-bold text-ink-secondary transition active:scale-[0.98]">
          <Icon name="camera" size={18} />
          Take Photo / Attach Image
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) onFileSelected(selected);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
