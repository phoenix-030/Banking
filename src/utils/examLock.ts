const CHANNEL_NAME = "hhk_exam_lock";
const STORAGE_KEY = "hhk_active_exam_lock";
const HEARTBEAT_TTL_MS = 10_000;

export const EXAM_TAB_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

type LockPayload = {
  tabId: string;
  testName: string;
  ts: number;
};

type BroadcastEvent =
  | { type: "EXAM_LOCK_START"; tabId: string; testName: string }
  | { type: "EXAM_LOCK_END"; tabId: string }
  | { type: "EXAM_COMPANION_OPENED"; tabId: string };

function readActiveLock(): LockPayload | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LockPayload;
    if (!parsed?.tabId || !parsed?.ts) return null;
    if (Date.now() - parsed.ts > HEARTBEAT_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function requestExamFullscreen() {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.fullscreenElement) return;
    if (typeof el.requestFullscreen === "function") {
      void Promise.resolve(el.requestFullscreen()).catch(() => undefined);
    } else if (typeof el.webkitRequestFullscreen === "function") {
      el.webkitRequestFullscreen();
    }
  } catch {
    // Browser may disallow fullscreen without active gesture; banner button handles re-entry.
  }
}

export function exitExamFullscreen() {
  try {
    if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      void Promise.resolve(document.exitFullscreen()).catch(() => undefined);
    }
  } catch {
    // Ignore exit failures when already closed.
  }
}

export function activateExamTabLock(
  testName: string,
  onExternalTabAttempt: () => void,
): () => void {
  const writeHeartbeat = () => {
    try {
      const payload: LockPayload = {
        tabId: EXAM_TAB_ID,
        testName,
        ts: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues.
    }
  };

  writeHeartbeat();
  const heartbeat = window.setInterval(writeHeartbeat, 3000);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({
      type: "EXAM_LOCK_START",
      tabId: EXAM_TAB_ID,
      testName,
    } satisfies BroadcastEvent);
    channel.onmessage = (event: MessageEvent<BroadcastEvent>) => {
      const msg = event.data;
      if (!msg || msg.tabId === EXAM_TAB_ID) return;
      if (msg.type === "EXAM_COMPANION_OPENED") {
        onExternalTabAttempt();
      }
    };
  } catch {
    channel = null;
  }

  return () => {
    window.clearInterval(heartbeat);
    try {
      const current = readActiveLock();
      if (current?.tabId === EXAM_TAB_ID) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore cleanup errors.
    }
    try {
      channel?.postMessage({
        type: "EXAM_LOCK_END",
        tabId: EXAM_TAB_ID,
      } satisfies BroadcastEvent);
      channel?.close();
    } catch {
      // Ignore channel close errors.
    }
  };
}

export function subscribeCompanionTabLock(
  onLockedOut: (info: { testName: string } | null) => void,
): () => void {
  let channel: BroadcastChannel | null = null;

  const notifyPrimaryAndTryClose = (info: { testName: string }) => {
    try {
      channel?.postMessage({
        type: "EXAM_COMPANION_OPENED",
        tabId: EXAM_TAB_ID,
      } satisfies BroadcastEvent);
    } catch {
      // Ignore
    }
    try {
      window.close();
    } catch {
      // Browsers allow window.close() on script-opened tabs; fallback renders locked blocker.
    }
    onLockedOut(info);
  };

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<BroadcastEvent>) => {
      const msg = event.data;
      if (!msg || msg.tabId === EXAM_TAB_ID) return;
      if (msg.type === "EXAM_LOCK_START") {
        notifyPrimaryAndTryClose({ testName: msg.testName });
      } else if (msg.type === "EXAM_LOCK_END") {
        onLockedOut(null);
      }
    };
  } catch {
    channel = null;
  }

  const existing = readActiveLock();
  if (existing && existing.tabId !== EXAM_TAB_ID) {
    notifyPrimaryAndTryClose({ testName: existing.testName });
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    if (!event.newValue) {
      onLockedOut(null);
      return;
    }
    const current = readActiveLock();
    if (current && current.tabId !== EXAM_TAB_ID) {
      notifyPrimaryAndTryClose({ testName: current.testName });
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      channel?.close();
    } catch {
      // Ignore
    }
  };
}
