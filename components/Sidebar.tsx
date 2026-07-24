"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/actions/auth";
import clsx from "clsx";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  items?: NavItem[];
  href?: string; // groups with no items (like Settings) link directly instead of expanding
  comingSoon?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "crm",
    label: "CRM",
    icon: CRMIcon,
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/analytics", label: "Analytics" },
      { href: "/territory", label: "Territory Map" },
      { href: "/companies/new", label: "Add company" },
      { href: "/companies/bulk-edit", label: "Bulk edit" },
    ],
  },
  {
    key: "tms",
    label: "TMS",
    icon: TMSIcon,
    items: [
      { href: "/loads", label: "Loads" },
      { href: "/carriers", label: "Carriers" },
      { href: "/tms-customers", label: "Customers" },
      { href: "/locations", label: "Locations" },
    ],
  },
  { key: "billing", label: "Billing", icon: BillingIcon, comingSoon: true },
  {
    key: "tools",
    label: "Tools",
    icon: ToolsIcon,
    items: [
      { href: "/scanner", label: "Document Scanner" },
      { href: "/notepad", label: "Notepad" },
    ],
  },
  { key: "settings", label: "Settings", icon: SettingsIcon, href: "/settings" },
];

export default function Sidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ crm: true });

  const isGroupActive = (group: NavGroup) =>
    group.items?.some((item) => pathname?.startsWith(item.href)) ||
    (group.href ? pathname?.startsWith(group.href) : false);

  const GroupedNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_GROUPS.map((group) => {
        const active = isGroupActive(group);

        if (group.comingSoon) {
          return (
            <div
              key={group.key}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-manifest-navy-100/40 cursor-default select-none"
            >
              <span className="flex items-center gap-3">
                <group.icon className="w-4 h-4 shrink-0" />
                {group.label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/5 rounded-full px-2 py-0.5">
                Soon
              </span>
            </div>
          );
        }

        if (!group.items) {
          return (
            <Link
              key={group.key}
              href={group.href!}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-manifest-navy-100 hover:bg-white/5 hover:text-white"
              )}
            >
              <group.icon className="w-4 h-4 shrink-0" />
              {group.label}
            </Link>
          );
        }

        const isOpen = expanded[group.key] ?? active;

        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [group.key]: !isOpen }))}
              className={clsx(
                "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "text-white"
                  : "text-manifest-navy-100 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <group.icon className="w-4 h-4 shrink-0" />
                {group.label}
              </span>
              <ChevronIcon className={clsx("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                {group.items.map((item) => {
                  const itemActive = pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={clsx(
                        "block rounded-md px-3 py-1.5 text-sm transition",
                        itemActive
                          ? "bg-white/10 text-white font-medium"
                          : "text-manifest-navy-100 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const AccountFooter = () => (
    <div className="px-3 py-4 border-t border-white/10">
      {email && (
        <div className="px-3 mb-2 text-xs text-manifest-navy-100 truncate" title={email}>
          {email}
        </div>
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-manifest-navy-100 hover:bg-white/5 hover:text-white transition"
        >
          <LogoutIcon className="w-4 h-4" />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-manifest-navy-800 px-4 py-3 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center">
          <img
            src="/paragon-nexus-logo.png"
            alt="Paragon Nexus"
            className="h-7 w-auto brightness-0 invert"
          />
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="text-white p-1.5 rounded-md hover:bg-white/10"
        >
          {open ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80%] h-full bg-manifest-navy-800 flex flex-col shadow-xl">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <img
                src="/paragon-nexus-logo.png"
                alt="Paragon Nexus"
                className="h-8 w-auto brightness-0 invert"
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="text-white p-1 rounded-md hover:bg-white/10"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <GroupedNav onNavigate={() => setOpen(false)} />
            <AccountFooter />
          </div>
        </div>
      )}

      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-manifest-navy-800 text-white flex-col h-screen sticky top-0">
        <div className="px-6 py-6 border-b border-white/10">
          <img
            src="/paragon-nexus-logo.png"
            alt="Paragon Nexus — Powered by Paragon Global Logistics"
            className="w-full h-auto brightness-0 invert"
          />
        </div>
        <GroupedNav />
        <AccountFooter />
      </aside>
    </>
  );
}

function CRMIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TMSIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function BillingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function ToolsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
