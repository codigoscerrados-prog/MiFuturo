import Link from "next/link";
import { Manrope, Sora } from "next/font/google";

import styles from "./BrandLogo.module.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const sizeMap = {
  xs: { icon: 48, company: 18, tagline: 12, gap: 0.35 },
  sm: { icon: 62, company: 22, tagline: 13, gap: 0.5 },
  md: { icon: 80, company: 26, tagline: 15, gap: 0.65 },
  lg: { icon: 96, company: 30, tagline: 17, gap: 0.8 },
} as const;

type SizeVariant = keyof typeof sizeMap;
type LogoVariant = "full" | "compact" | "icon";

type BrandLogoProps = {
  variant?: LogoVariant;
  size?: SizeVariant;
  className?: string;
  href?: string;
};

export default function BrandLogo({
  variant = "full",
  size = "md",
  className = "",
  href,
}: BrandLogoProps) {
  const metrics = sizeMap[size];
  const gapValue =
    variant === "icon" ? 0 : variant === "full" ? metrics.gap * 0.4 : metrics.gap;

  const wrapperClasses = [styles.brandLogo, styles[variant], className]
    .filter(Boolean)
    .join(" ")
    .trim();

  const content = (
    <>
      <span
        className={`${styles.iconWrapper} inline-flex items-center justify-center`}
        style={{ width: `${metrics.icon}px`, height: `${metrics.icon}px` }}
      >
        <svg
          id="logo-icon"
          width={metrics.icon}
          height={metrics.icon}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          focusable="false"
        >
          <rect x="10" y="15" width="80" height="70" fill="#7dd87d" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="50" y1="15" x2="50" y2="85" stroke="#ffffff" strokeWidth="2" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="50" cy="50" r="2" fill="#ffffff" />
          <rect x="10" y="32" width="18" height="36" fill="none" stroke="#ffffff" strokeWidth="2" />
          <rect x="10" y="40" width="10" height="20" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="72" y="32" width="18" height="36" fill="none" stroke="#ffffff" strokeWidth="2" />
          <rect x="80" y="40" width="10" height="20" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="10" cy="15" r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="90" cy="15" r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="10" cy="85" r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="90" cy="85" r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      </span>

      {variant !== "icon" ? (
        <span className={`${styles.textStack} leading-none`}>
          <span
            className={`${styles.companyName} ${styles.textShadow} ${sora.className}`}
            style={{ fontSize: `${metrics.company}px` }}
          >
            LV
          </span>

          {variant === "full" ? (
            <span
              className={`${styles.tagline} ${manrope.className}`}
              style={{ fontSize: `${metrics.tagline}px` }}
            >
              Crecimiento Sostenible
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const sharedProps = {
    className: wrapperClasses,
    "aria-label": "Lateral Verde",
    style: { gap: `${gapValue}rem` },
  } as const;

  if (href) {
    return (
      <Link href={href} {...sharedProps}>
        {content}
      </Link>
    );
  }

  return (
    <div {...sharedProps}>
      {content}
    </div>
  );
}
