"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function CaptureQrCode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setSrc("");
      return;
    }

    void QRCode.toDataURL(value, {
      width: 260,
      margin: 1,
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
    }).then((nextSrc) => {
      if (!cancelled) {
        setSrc(nextSrc);
      }
    }).catch(() => {
      if (!cancelled) {
        setSrc("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className={className} />;
  }

  return <img alt="Scan to open phone camera capture" className={className} src={src} />;
}
