/**
 * Site-wide constants and configuration
 * Central location for logos, branding, and other site information
 */

/** Public site URL – always use this for email logo/links so emails work from any environment. */
const SITE_PUBLIC_URL = "https://selini-shirt.de";

/** Absolute URL to the PNG logo on the public site – use this in all email templates (PNG for broad client support). */
const EMAIL_LOGO_PNG_URL = `${SITE_PUBLIC_URL}/images/logo/logo-1.png`;

export const SITE_CONFIG = {
	// Site URL (use SITE_PUBLIC_URL for emails so logo is always publicly reachable)
	url: SITE_PUBLIC_URL,

	// Branding
	brand: {
		name: "BySelini",
		tagline: "Transferdruckerei, Textildruck und Stickerei. Seit über 30 Jahren in Berlin – hochwertige Transferdrucke und individuelle Veredelung.",
		logo: {
			/** Relative path for use in pages (navbar, footer). Use an image at least 200px wide for sharp display. */
			primary: "/images/logo/logo-1.webp",
			/** Optional: 2x resolution for retina (e.g. "/images/logo/logo-1@2x.webp"). If set, navbar uses srcset for crisp display. */
			primary2x: undefined,
			/** Public absolute URL for header logo in emails (PNG). All email templates must use this – do not use primary (webp) or relative paths. */
			headerUrl: EMAIL_LOGO_PNG_URL,
			alt: "BySelini Logo",
		},
	},

	// Contact Information
	contact: {
		email: "info@byselini.de",
		phone: "+493023272726",
		displayPhone: "+49 (0) 30/2327 2726",
	},
	
	// Social Media Links
	social: {
		facebook: "#",
		instagram: "#",
		linkedin: "#",
		twitter: "#",
	},
	
	// Company Information
	company: {
		legalName: "BYSELINI UG (haftungsbeschränkt)",
		address: "Klingsorstraße 31–33",
		postalCode: "12167",
		city: "Berlin",
		location: "Berlin, Deutschland",
		/** Short address for email footers (Impressum) */
		shortAddress: "Klingsorstraße 31–33, 12167 Berlin",
	},
} as const;
