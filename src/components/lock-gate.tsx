import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LockGate, pinLooksValid } from "@/lib/lock";
import { useNotebookStore } from "@/lib/store";

export type LockMode = "set" | "unlock" | "clear";

export type LockRequest = {
  kind: "note" | "folder";
  id: string;
  mode: LockMode;
  title: string;
};

type OpenLock = (request: LockRequest) => void;
let opener: OpenLock | null = null;

export function registerLockDialog(handler: OpenLock) {
  opener = handler;
  return () => {
    if (opener === handler) opener = null;
  };
}

export function openLockDialog(request: LockRequest) {
  opener?.(request);
}

export function LockOverlay({ gate }: { gate: LockGate }) {
  return (
    <div className="lock-gate">
      <Lock className="size-8 text-ink-muted" aria-hidden />
      <p className="font-display text-xl text-ink">{gate.kind === "folder" ? "This folder is locked" : "This page is locked"}</p>
      <p className="max-w-sm text-pretty text-sm text-ink-muted">
        {gate.name} stays on this device. Enter the passcode you chose. Quire cannot recover it.
      </p>
      <Button
        onClick={() =>
          openLockDialog({
            kind: gate.kind,
            id: gate.id,
            mode: "unlock",
            title: gate.name,
          })
        }
      >
        Unlock
      </Button>
    </div>
  );
}

export function LockDialogHost() {
  const [request, setRequest] = useState<LockRequest | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const setLock = useNotebookStore((s) => s.setLock);
  const unlock = useNotebookStore((s) => s.unlock);
  const clearLock = useNotebookStore((s) => s.clearLock);

  useEffect(() => {
    return registerLockDialog((next) => {
      setRequest(next);
      setPin("");
      setConfirm("");
    });
  }, []);

  async function submit() {
    if (!request) return;
    if (!pinLooksValid(pin)) {
      toast.error("Use at least 4 characters.");
      return;
    }
    if (request.mode === "set" && pin.trim() !== confirm.trim()) {
      toast.error("Those passcodes do not match.");
      return;
    }
    setBusy(true);
    try {
      const ok =
        request.mode === "set"
          ? await setLock(request.kind, request.id, pin)
          : request.mode === "clear"
            ? await clearLock(request.kind, request.id, pin)
            : await unlock(request.kind, request.id, pin);
      if (!ok) {
        toast.error(request.mode === "set" ? "Could not lock that." : "That passcode does not match.");
        return;
      }
      toast(
        request.mode === "set"
          ? "Locked on this device"
          : request.mode === "clear"
            ? "Lock removed"
            : "Unlocked for this session",
      );
      setRequest(null);
      setPin("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  const title =
    request?.mode === "set"
      ? `Lock ${request.kind === "folder" ? "folder" : "page"}`
      : request?.mode === "clear"
        ? "Remove lock"
        : "Unlock";

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && setRequest(null)}>
      <DialogContent className="max-w-sm" data-close-on-back>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {request?.mode === "set"
              ? `Choose a passcode for “${request.title}”. It never leaves this device, and Quire cannot recover it.`
              : `Enter the passcode for “${request?.title ?? ""}”.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="quire-pin">Passcode</Label>
            <Input
              id="quire-pin"
              type="password"
              autoComplete="off"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoFocus
            />
          </div>
          {request?.mode === "set" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="quire-pin-confirm">Confirm</Label>
              <Input
                id="quire-pin-confirm"
                type="password"
                autoComplete="off"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRequest(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {request?.mode === "set" ? "Lock" : request?.mode === "clear" ? "Remove" : "Unlock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function requestClearLock(kind: "note" | "folder", id: string, title: string) {
  openLockDialog({ kind, id, mode: "clear", title });
}
