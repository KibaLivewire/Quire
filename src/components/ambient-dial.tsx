import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  setAmbientMuted,
  setAmbientVolume,
  snapshot,
  startAmbient,
  stopAmbient,
  subscribeAmbient,
  toggleAmbientMute,
} from "@/lib/ambient";
import { useNotebookStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AmbientDial() {
  const prefs = useNotebookStore((s) => s.prefs);
  const setPrefs = useNotebookStore((s) => s.setPrefs);
  const [muted, setMuted] = useState(() => snapshot().muted);
  const [volume, setVolume] = useState(() => snapshot().volume);

  useEffect(() => {
    return subscribeAmbient((state) => {
      setMuted(state.muted);
      setVolume(state.volume);
    });
  }, []);

  useEffect(() => {
    if (prefs.ambient === false) stopAmbient();
    else void startAmbient(prefs.ambientVolume ?? 0.22, prefs.theme);
  }, [prefs.ambient, prefs.ambientVolume, prefs.theme]);

  if (prefs.ambient === false) return null;

  return (
    <div className={cn("ambient-dial no-print")}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={muted ? "Unmute the room" : "Mute the room"}
        onClick={() => {
          toggleAmbientMute();
        }}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </Button>
      <Slider
        className="w-20"
        min={0}
        max={100}
        step={1}
        value={[Math.round((muted ? 0 : volume) * 100)]}
        onValueChange={([value]) => {
          const next = value / 100;
          setPrefs({ ambient: true, ambientVolume: next });
          setAmbientMuted(next === 0);
          setAmbientVolume(next);
          if (next > 0) void startAmbient(next, prefs.theme);
        }}
        aria-label="Room volume"
      />
    </div>
  );
}
