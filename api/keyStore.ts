export type KeyState = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface ApiKey {
  id: string;
  key: string;
  state: KeyState;
  recovery_until?: number;
}

// In-memory persistent state (simulating a database/Redis)
// In a real Vercel environment, this would be a real DB like Upstash Redis or Firestore.
// For this sandbox, this in-memory store persists as long as the server is running.
class KeyStore {
  private keys: ApiKey[] = [
    { id: '1', key: 'AIzaSyA_FAKE_KEY_1', state: 'GREEN' },
    { id: '2', key: 'AIzaSyB_FAKE_KEY_2', state: 'GREEN' },
    { id: '3', key: 'AIzaSyC_FAKE_KEY_3', state: 'GREEN' },
    { id: '4', key: 'AIzaSyD_FAKE_KEY_4', state: 'GREEN' },
  ];

  public getKeys(): ApiKey[] {
    this.healKeys();
    return [...this.keys];
  }

  public getKey(id: string): ApiKey | undefined {
    this.healKeys();
    return this.keys.find(k => k.id === id);
  }

  public updateKeyState(id: string, state: KeyState, recovery_until?: number) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.state = state;
      if (recovery_until !== undefined) {
        key.recovery_until = recovery_until;
      } else {
        delete key.recovery_until;
      }
    }
  }

  // Atomically heal ORANGE keys back to GREEN if cooldown expired
  private healKeys() {
    const now = Date.now();
    this.keys.forEach(k => {
      if (k.state === 'ORANGE' && k.recovery_until && now >= k.recovery_until) {
        k.state = 'GREEN';
        delete k.recovery_until;
      }
    });
  }
}

export const keyStore = new KeyStore();
