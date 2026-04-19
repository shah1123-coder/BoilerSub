"use client";

import Script from "next/script";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Toast } from "@/components/Toast";
import { apiClient } from "@/lib/apiClient";
import type { Listing } from "@/lib/types";

declare global {
  interface Window {
    pannellum?: {
      viewer: (containerId: string, config: Record<string, unknown>) => { destroy?: () => void };
    };
    initPanoramaViewer?: (
      imageSource: string,
      options?: { containerId?: string; fallbackImage?: string },
    ) => { destroy?: () => void };
  }
}

function resolvePanoramaImage(listing: Listing | null): string | null {
  if (!listing) {
    return null;
  }

  return listing.panorama_image ?? listing.images?.[0] ?? null;
}

export default function ListingPanoramaPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);

  function handleClose() {
    try {
      if (window.opener) {
        window.close();
        return;
      }
    } catch {
      // If browser blocks close, fall through to navigation fallback.
    }
    window.history.back();
  }

  useEffect(() => {
    let active = true;

    void apiClient.listings
      .getById(params.id)
      .then((nextListing) => {
        if (!active) {
          return;
        }

        setListing(nextListing);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load panorama");
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    const panoramaImage = resolvePanoramaImage(listing);
    if (!scriptsReady || !panoramaImage || !window.initPanoramaViewer) {
      return;
    }

    const viewer = window.initPanoramaViewer(panoramaImage, {
      containerId: "panorama-viewer",
      fallbackImage: panoramaImage,
      autoLoad: true,
      type: listing?.panorama_image ? "equirectangular" : "equirectangular",
      haov: listing?.panorama_image ? 360 : 120, // Narrow field of view for non-panoramas
      vaov: listing?.panorama_image ? 180 : 80,
    });

    return () => {
      if (viewer?.destroy) {
        viewer.destroy();
      }
    };
  }, [listing, scriptsReady]);

  return (
    <main className="fixed inset-0 z-[9999] bg-[#101820] text-white">
      <link href="/vendor/pannellum/pannellum.css" rel="stylesheet" />
      <Script src="/vendor/pannellum/pannellum.js" strategy="afterInteractive" />
      <Script
        src="/vendor/pannellum/panorama-bridge.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsReady(true)}
      />

      <section className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/60">BoilerSub Panorama</p>
            <h1 className="text-xl font-bold">{listing?.title ?? "Loading panorama..."}</h1>
          </div>
          <button
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
            type="button"
            onClick={handleClose}
          >
            Close
          </button>
        </header>

        {error ? <div className="p-4"><Toast kind="error" message={error} /></div> : null}

        <div className="relative flex-1">
          <div id="panorama-viewer" className="h-full w-full" />
          {!resolvePanoramaImage(listing) && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#101820] text-sm text-white/75">
              Loading immersive preview...
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
