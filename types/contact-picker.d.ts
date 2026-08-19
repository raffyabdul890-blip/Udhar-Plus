// Contact Picker API — experimental, Chromium/Android only. Not in TypeScript's
// built-in DOM lib, so we declare just enough of it to use safely. Always feature-
// detect with `navigator.contacts?.select` before calling; there is no manual fallback.
export {};

declare global {
  interface ContactInfo {
    name?: string[];
    tel?: string[];
    email?: string[];
  }

  interface ContactsSelectOptions {
    multiple?: boolean;
  }

  interface ContactsManager {
    select(properties: string[], options?: ContactsSelectOptions): Promise<ContactInfo[]>;
  }

  interface Navigator {
    contacts?: ContactsManager;
  }
}
