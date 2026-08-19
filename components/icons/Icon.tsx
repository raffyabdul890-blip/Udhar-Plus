/**
 * Single hand-rolled icon set for the whole app — replaces every emoji icon.
 * Plain inline SVG (24x24, stroke-based, currentColor) so there's no new
 * dependency, matching this project's established minimal-dependency culture.
 */

export type IconName =
  | "dashboard"
  | "khata"
  | "cashbook"
  | "sales"
  | "items"
  | "reports"
  | "bank"
  | "more"
  | "search"
  | "plus"
  | "minus"
  | "whatsapp"
  | "camera"
  | "user"
  | "users"
  | "edit"
  | "trash"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "check"
  | "check-circle"
  | "transfer"
  | "calendar"
  | "phone"
  | "filter"
  | "download"
  | "upload"
  | "cash-in"
  | "cash-out"
  | "alert-triangle"
  | "info"
  | "logout"
  | "globe"
  | "shield"
  | "file-text"
  | "help-circle"
  | "bell"
  | "receipt"
  | "contact"
  | "image"
  | "wallet"
  | "chart-bar"
  | "arrow-right"
  | "clock";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  khata: (
    <>
      <path d="M6 3h11a2 2 0 0 1 2 2v15l-3-1.8-3 1.8-3-1.8-3 1.8V5a2 2 0 0 1 2-2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  cashbook: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.6" />
    </>
  ),
  sales: (
    <>
      <path d="M6 8V6a3 3 0 1 1 6 0v2" />
      <rect x="3.5" y="8" width="14" height="12" rx="2" />
      <path d="M8 12.5h6" />
    </>
  ),
  items: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5L12 12 3.5 7.5z" />
      <path d="M3.5 7.5V16l8.5 4.5V12M20.5 7.5V16L12 20.5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M11 20V4M18 20v-6" />
      <path d="M2.5 20h19" />
    </>
  ),
  bank: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M4.5 10v9M9 10v9M15 10v9M19.5 10v9" />
      <path d="M2.5 19.5h19" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  whatsapp: (
    <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm4.4 12.6c-.2.6-1.2 1.1-1.9 1.2-.5.1-1.1.2-3.5-.7-2.9-1.2-4.8-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.4 0 .6.3.5 1 1.4 2 2.2 1 .8 1.7 1 2 1.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.9 1c.2.1.4.2.5.3.1.2.1.9-.1 1.5z" />
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19c1-3.4 3.3-5.2 6.2-5.2s5.2 1.8 6.2 5.2" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 6.2" />
      <path d="M16.8 13.9c2.3.4 4 2 4.8 5.1" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20l.9-4L16 4.9a1.7 1.7 0 0 1 2.4 0l.7.7a1.7 1.7 0 0 1 0 2.4L8 19.1 4 20z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6.5 7l.8 12.2A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.8L18.5 7" />
      <path d="M10.2 11v6M13.8 11v6" />
    </>
  ),
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16.2 9" />
    </>
  ),
  transfer: (
    <>
      <path d="M4 8h13M13.5 4l3.5 4-3.5 4" />
      <path d="M20 16H7M10.5 12l-3.5 4 3.5 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h2.8l1.4 4.4-2 1.6a12 12 0 0 0 5.8 5.8l1.6-2 4.4 1.4v2.8a1.6 1.6 0 0 1-1.7 1.6A16.5 16.5 0 0 1 4.9 5.2a1.6 1.6 0 0 1 1.6-1.7z" />
  ),
  filter: <path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" />,
  download: (
    <>
      <path d="M12 3.5v11.5M7.5 11l4.5 4.5L16.5 11" />
      <path d="M4.5 19h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20.5V9M7.5 13l4.5-4.5L16.5 13" />
      <path d="M4.5 5h15" />
    </>
  ),
  "cash-in": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M8 12l4-4 4 4" />
    </>
  ),
  "cash-out": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M8 12.5l4 4 4-4" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M12 4 21.5 20h-19L12 4z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.7h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M15.5 16l4.5-4-4.5-4M20 12H9" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  shield: <path d="M12 3.5 19.5 6.5v5.7c0 5-3.2 8.3-7.5 9.8-4.3-1.5-7.5-4.8-7.5-9.8V6.5L12 3.5z" />,
  "file-text": (
    <>
      <path d="M7 3.5h7l4.5 4.5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h7" />
    </>
  ),
  "help-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 2" />
      <path d="M12 17.2h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10.5a6 6 0 1 1 12 0c0 4 1.2 5 1.2 5H4.8s1.2-1 1.2-5z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  contact: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="9.5" r="2.3" />
      <path d="M8.2 16.5c.8-2 2-3 3.8-3s3 1 3.8 3" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M4 18l5-5 3 3 3.5-3.5L20 17" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5z" />
      <path d="M15.5 13a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z" />
    </>
  ),
  "chart-bar": (
    <>
      <path d="M4 20V10M11 20V4M18 20v-6" />
      <path d="M2.5 20h19" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.5 2" />
    </>
  ),
};

export default function Icon({
  name,
  size = 22,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "whatsapp" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "whatsapp" ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
