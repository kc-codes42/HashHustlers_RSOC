import * as Y from "yjs";

/**
 * Collaboration Setup Module (lib/collaboration/yjsSetup.ts)
 * 
 * Optimized for Next.js SSR. 
 * Heavy browser-dependent providers are initialized only on the client.
 */

export const getYjsSetup = (roomId: string) => {
  // Ensure this only runs on the client
  if (typeof window === 'undefined') {
    return { doc: new Y.Doc(), provider: null as any, sharedText: null as any };
  }

  // We import y-websocket dynamically here to avoid server-side evaluation issues
  // because getYjsSetup is called in useClient components.
  // Actually, keeping the import at top is fine as long as WebsocketProvider 
  // isn't instantiated on the server.
  const { WebsocketProvider } = require("y-websocket");

  const doc = new Y.Doc();
  const provider = new WebsocketProvider("ws://localhost:1234", roomId, doc);
  const sharedText = doc.getText("monaco");

  return { doc, provider, sharedText };
};
