import { useEffect, useRef, useState } from 'react';
import type { Doc } from '../types';
import { getAsset, getAssetPixels } from '../lib/assets';
import { buildPatch, patchKey } from '../lib/inpaint';
import { coverRect, coversApply, type RenderDeps } from '../lib/render';

const CACHE_LIMIT = 48;

/**
 * Keeps one cover bitmap per layer in sync with the document.
 *
 * Patches are keyed by everything that affects their pixels, so dragging a
 * layer around re-uses an earlier patch the moment it returns to a position it
 * already visited. `renderKey` exists because the canvas repaints in a child
 * effect, which runs before this one — bumping it forces a second paint with
 * the fresh patches.
 */
export function usePatches(doc: Doc): { deps: RenderDeps; renderKey: number } {
  const cacheRef = useRef(new Map<string, HTMLCanvasElement | null>());
  const byLayerRef = useRef(new Map<string, HTMLCanvasElement | null>());
  const depsRef = useRef<RenderDeps>({
    getPatch: (layerId: string) => byLayerRef.current.get(layerId) ?? null,
  });
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    const next = new Map<string, HTMLCanvasElement | null>();

    if (coversApply(doc)) {
      const image = getAsset(doc.sourceAssetId);
      const pixels = getAssetPixels(doc.sourceAssetId);

      if (image && pixels) {
        for (const layer of doc.layers) {
          if (!layer.cover.enabled || layer.cover.mode === 'none') continue;

          const rect = coverRect(layer);
          const key = patchKey(
            layer.id,
            rect,
            layer.cover.mode,
            layer.cover.color,
            layer.cover.softness,
          );

          if (!cacheRef.current.has(key)) {
            cacheRef.current.set(
              key,
              buildPatch({
                image,
                pixels,
                rect,
                mode: layer.cover.mode,
                color: layer.cover.color,
                softness: layer.cover.softness,
              }),
            );

            // Dragging mints a patch per position; drop the oldest entries.
            while (cacheRef.current.size > CACHE_LIMIT) {
              const oldest = cacheRef.current.keys().next().value;
              if (oldest === undefined) break;
              cacheRef.current.delete(oldest);
            }
          }

          next.set(layer.id, cacheRef.current.get(key) ?? null);
        }
      }
    }

    byLayerRef.current = next;
    setRenderKey((key) => key + 1);
  }, [doc]);

  return { deps: depsRef.current, renderKey };
}
