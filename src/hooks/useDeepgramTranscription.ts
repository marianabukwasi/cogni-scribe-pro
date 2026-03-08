import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TranscriptLine {
  speaker: string;
  lang: string;
  time: string;
  text: string;
  lowConfidence?: boolean;
  isInterim?: boolean;
}

const SPEAKER_LABELS: Record<number, string> = { 0: "Professional", 1: "Client" };
const LANG_DISPLAY: Record<string, string> = {
  en: "EN", fr: "FR", de: "DE", lb: "LU", hu: "HU", ar: "AR",
  ti: "TI", so: "SO", fa: "FA", ps: "PS", am: "AM", es: "ES",
  pt: "PT", it: "IT", nl: "NL", pl: "PL", ro: "RO", uk: "UK", ru: "RU",
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useDeepgramTranscription() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const shouldReconnectRef = useRef(false);

  const cleanup = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async (sessionLang?: string) => {
    setIsConnecting(true);
    setError(null);

    // 1. Get mic permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
    } catch {
      setMicPermission("denied");
      setError("Microphone permission denied");
      setIsConnecting(false);
      return false;
    }

    // 2. Get Deepgram token
    let apiKey: string;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("deepgram-token");
      if (fnError || !data?.key) throw new Error(fnError?.message || "No key returned");
      apiKey = data.key;
    } catch (e: any) {
      setError("Could not get transcription token: " + (e.message || ""));
      setIsConnecting(false);
      stream.getTracks().forEach(t => t.stop());
      return false;
    }

    // 3. Open WebSocket to Deepgram
    const lang = sessionLang === "multi" || !sessionLang ? "multi" : sessionLang;
    const params = new URLSearchParams({
      model: "nova-2",
      language: lang,
      diarize: "true",
      smart_format: "true",
      punctuate: "true",
      interim_results: "true",
      encoding: "opus",
      sample_rate: "48000",
    });

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    wsRef.current = ws;
    sessionStartRef.current = Date.now();
    shouldReconnectRef.current = true;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);

      // Start recording and sending audio chunks
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      recorder.start(250); // send chunks every 250ms
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.channel?.alternatives?.[0]) return;

        const alt = data.channel.alternatives[0];
        const transcript = alt.transcript;
        if (!transcript) return;

        const isFinal = data.is_final;
        const words = alt.words || [];

        // Get speaker from first word with diarization
        const speakerNum = words[0]?.speaker ?? 0;
        const speakerLabel = SPEAKER_LABELS[speakerNum] || `Speaker ${speakerNum + 1}`;

        // Detect language
        const detectedLang = data.channel?.detected_language || alt.languages?.[0] || "en";
        const langDisplay = LANG_DISPLAY[detectedLang] || detectedLang.toUpperCase().slice(0, 2);

        // Confidence
        const avgConfidence = words.length > 0
          ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / words.length
          : 1;

        // Time from session start
        const elapsed = (Date.now() - sessionStartRef.current) / 1000;
        const timeStr = formatTimestamp(elapsed);

        const newLine: TranscriptLine = {
          speaker: speakerLabel,
          lang: langDisplay,
          time: timeStr,
          text: transcript,
          lowConfidence: avgConfidence < 0.7,
          isInterim: !isFinal,
        };

        setLines(prev => {
          if (!isFinal) {
            // Replace last interim or add new
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].isInterim) {
              const updated = [...prev];
              updated[lastIdx] = newLine;
              return updated;
            }
            return [...prev, newLine];
          } else {
            // Replace interim with final, or add
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].isInterim) {
              const updated = [...prev];
              updated[lastIdx] = newLine;
              return updated;
            }
            return [...prev, newLine];
          }
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError("Transcription connection error");
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (shouldReconnectRef.current) {
        setError("Connection lost — reconnecting...");
        reconnectTimerRef.current = setTimeout(() => connect(sessionLang), 3000);
      }
    };

    return true;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    lines,
    isConnected,
    isConnecting,
    error,
    micPermission,
    connect,
    disconnect,
    pause,
    resume,
    setLines,
  };
}
