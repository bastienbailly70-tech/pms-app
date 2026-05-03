"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PropertyPhotoModel } from "@/generated/prisma/models";

type Props = {
  propertyId: string;
  initialPhotos: PropertyPhotoModel[];
};

export function PhotoManager({ propertyId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<PropertyPhotoModel[]>(
    [...initialPhotos].sort((a, b) => a.position - b.position)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setUploading(true);

      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`/api/upload?propertyId=${propertyId}`, {
          method: "POST",
          body: form,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erreur lors de l'upload.");
        } else {
          setPhotos((prev) => [...prev, data.photo as PropertyPhotoModel]);
        }
      }

      setUploading(false);
    },
    [propertyId]
  );

  async function handleDelete(photoId: string) {
    const res = await fetch("/api/upload/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex);

    setPhotos(reordered);

    await fetch("/api/upload/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        orderedIds: reordered.map((p) => p.id),
      }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Photos ({photos.length})
        </h2>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
          {uploading ? "Upload..." : "+ Ajouter"}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <DropZone onFiles={handleFiles} uploading={uploading} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  isCover={index === 0}
                  onDelete={handleDelete}
                />
              ))}
              <AddPhotoButton onFiles={handleFiles} uploading={uploading} />
            </div>
          </SortableContext>
        </DndContext>
      )}

      {photos.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Glissez les photos pour les réordonner. La première photo est la photo de couverture.
        </p>
      )}
    </div>
  );
}

function SortablePhoto({
  photo,
  isCover,
  onDelete,
}: {
  photo: PropertyPhotoModel;
  isCover: boolean;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-[4/3]">
      <img
        src={photo.url}
        alt=""
        className="w-full h-full object-cover rounded-lg border border-gray-200"
        loading="lazy"
      />
      {isCover && (
        <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
          Couverture
        </span>
      )}
      <div className="absolute inset-0 flex items-start justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onDelete(photo.id)}
          className="w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-red-600 hover:border-red-300 text-xs flex items-center justify-center shadow-sm"
        >
          ×
        </button>
      </div>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-white/80 border border-gray-200 rounded cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-gray-400">
          <circle cx="3" cy="3" r="1" />
          <circle cx="7" cy="3" r="1" />
          <circle cx="3" cy="7" r="1" />
          <circle cx="7" cy="7" r="1" />
        </svg>
      </div>
    </div>
  );
}

function DropZone({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  return (
    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
      <div className="text-3xl text-gray-300 mb-2">📷</div>
      <p className="text-sm font-medium text-gray-600">
        {uploading ? "Chargement..." : "Cliquez ou glissez des photos ici"}
      </p>
      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 10MB par photo</p>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        disabled={uploading}
      />
    </label>
  );
}

function AddPhotoButton({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  return (
    <label className="aspect-[4/3] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
      <span className="text-2xl text-gray-300">+</span>
      <span className="text-xs text-gray-400 mt-1">{uploading ? "..." : "Ajouter"}</span>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        disabled={uploading}
      />
    </label>
  );
}
