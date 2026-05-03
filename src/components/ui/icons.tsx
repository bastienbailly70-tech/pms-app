// Inline SVG icon components — no external dependency required
// All icons are from the Lucide design system (https://lucide.dev)

type IconProps = { className?: string; size?: number; style?: React.CSSProperties };

const icon = (paths: React.ReactNode, props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 16}
    height={props.size ?? 16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
  >
    {paths}
  </svg>
);

export const IconDashboard = (p: IconProps) => icon(<>
  <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
  <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
</>, p);

export const IconBuilding = (p: IconProps) => icon(<>
  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
  <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
</>, p);

export const IconCalendar = (p: IconProps) => icon(<>
  <path d="M8 2v4"/><path d="M16 2v4"/>
  <rect width="18" height="18" x="3" y="4" rx="2"/>
  <path d="M3 10h18"/>
</>, p);

export const IconBarChart = (p: IconProps) => icon(<>
  <path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M11 16V9"/><path d="M15 16v-3"/><path d="M19 16V6"/>
</>, p);

export const IconSettings = (p: IconProps) => icon(<>
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</>, p);

export const IconLogOut = (p: IconProps) => icon(<>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
</>, p);

export const IconAlertTriangle = (p: IconProps) => icon(<>
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
  <path d="M12 9v4"/><path d="M12 17h.01"/>
</>, p);

export const IconTrendingUp = (p: IconProps) => icon(<>
  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
  <polyline points="16 7 22 7 22 13"/>
</>, p);

export const IconTrendingDown = (p: IconProps) => icon(<>
  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
  <polyline points="16 17 22 17 22 11"/>
</>, p);

export const IconDollarSign = (p: IconProps) => icon(<>
  <line x1="12" x2="12" y1="2" y2="22"/>
  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
</>, p);

export const IconUsers = (p: IconProps) => icon(<>
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</>, p);

export const IconArrowUpRight = (p: IconProps) => icon(<>
  <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
</>, p);

export const IconHome = (p: IconProps) => icon(<>
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</>, p);

export const IconSync = (p: IconProps) => icon(<>
  <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/>
  <path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2"/>
</>, p);

export const IconCheck = (p: IconProps) => icon(<>
  <path d="M20 6 9 17l-5-5"/>
</>, p);

export const IconX = (p: IconProps) => icon(<>
  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
</>, p);

export const IconChevronRight = (p: IconProps) => icon(<>
  <path d="m9 18 6-6-6-6"/>
</>, p);

export const IconMapPin = (p: IconProps) => icon(<>
  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
  <circle cx="12" cy="10" r="3"/>
</>, p);

export const IconCalendarCheck = (p: IconProps) => icon(<>
  <path d="M8 2v4"/><path d="M16 2v4"/>
  <rect width="18" height="18" x="3" y="4" rx="2"/>
  <path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>
</>, p);

export const IconBell = (p: IconProps) => icon(<>
  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
</>, p);

export const IconSearch = (p: IconProps) => icon(<>
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
</>, p);

export const IconFilter = (p: IconProps) => icon(<>
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
</>, p);

export const IconPlus = (p: IconProps) => icon(<>
  <path d="M5 12h14"/><path d="M12 5v14"/>
</>, p);

export const IconStar = (p: IconProps) => icon(<>
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
</>, p);
