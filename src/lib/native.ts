import { useEffect, useState } from "react";

export function isNativeApp() {
  try {
    return Boolean((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function useIsPhone() {
  const [phone, setPhone] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return phone;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      resolve(text.includes(",") ? text.slice(text.indexOf(",") + 1) : text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function saveFile(filename: string, blob: Blob) {
  if (isNativeApp()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: filename, files: [uri] });
    return;
  }
  const picker = (
    window as Window & {
      showSaveFilePicker?: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    }
  ).showSaveFilePicker;
  if (typeof picker === "function") {
    const handle = await picker({
      suggestedName: filename,
      types: [{ description: filename, accept: { [blob.type || "application/octet-stream"]: ["." + filename.split(".").pop()] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickNativeImages(): Promise<File[]> {
  if (!isNativeApp()) return [];
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    quality: 90,
    allowEditing: false,
  });
  const dataUrl = photo.dataUrl;
  if (!dataUrl) return [];
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = photo.format === "png" ? "png" : photo.format === "gif" ? "gif" : photo.format === "webp" ? "webp" : "jpg";
  const file = new File([blob], `photo.${ext}`, { type: blob.type || `image/${ext === "jpg" ? "jpeg" : ext}` });
  return [file];
}

export async function openNativeUrl(url: string) {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

export async function initNativeShell() {
  if (!isNativeApp()) return;
  const [{ StatusBar, Style }, { Keyboard, KeyboardResize }, { App }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/keyboard"),
    import("@capacitor/app"),
  ]);
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setBackgroundColor({ color: "#1a1714" });
  await StatusBar.setStyle({ style: Style.Dark });
  await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  App.addListener("backButton", ({ canGoBack }) => {
    const close = document.querySelector<HTMLElement>("[data-close-on-back]");
    if (close) {
      close.click();
      return;
    }
    const back = document.querySelector<HTMLElement>("[data-mobile-back]");
    if (back) {
      back.click();
      return;
    }
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}
