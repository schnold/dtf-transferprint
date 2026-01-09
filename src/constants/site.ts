/**
 * Site-wide constants and configuration
 * Central location for logos, branding, and other site information
 */

export const SITE_CONFIG = {
	// Branding
	brand: {
		name: "DTF Transfer Print",
		tagline: "Professionelle Drucklösungen seit 2009. Ihre Vision, unsere Expertise.",
		logo: {
			primary: "/images/logo/logo-1.png",
			alt: "DTF Transfer Print Logo",
		},
	},
	
	// Contact Information
	contact: {
		email: "info@dtf-transferprint.de",
		phone: "+49123456789",
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
		founded: 2009,
		location: "Deutschland",
	},
} as const;
