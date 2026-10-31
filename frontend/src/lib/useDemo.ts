import { useEffect, useState } from 'react';

// True only when the server actually has the demo accounts (BOOTSTRAP_DEMO=1 or the local seed).
export function useDemo() {
  const [demo, setDemo] = useState(false);
  useEffect(() => { fetch('/api/health').then(r => r.json()).then(j => setDemo(!!j.demo)).catch(() => {}); }, []);
  return demo;
}
