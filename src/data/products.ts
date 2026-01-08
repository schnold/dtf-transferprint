export interface Product {
	id: string;
	slug: string;
	name: string;
	shortDescription: string;
	description: string;
	price: number;
	images: string[];
	category: string;
	specifications: {
		material?: string;
		size?: string;
		colors?: string;
		durability?: string;
		printArea?: string;
		application?: string;
		careInstructions?: string;
	};
	inStock: boolean;
	tags: string[];
	reviews?: Review[];
}

export interface Review {
	id: string;
	author: string;
	rating: number;
	comment: string;
	date: string;
	verified: boolean;
}

export const products: Product[] = [
	{
		id: "dtf-transfer-basic",
		slug: "dtf-transfer-basic",
		name: "DTF Transfer - Basic",
		shortDescription: "Hochwertiger DTF-Transfer für Textilien mit lebendigen Farben",
		description: "Unser Standard DTF-Transfer bietet hervorragende Qualität für alle Ihre Textilprojekte. Perfekt für T-Shirts, Hoodies, Taschen und mehr. Die Transferfolie gewährleistet eine langlebige Haftung und brillante Farbwiedergabe.",
		price: 2.50,
		images: [
			"/images/products/dtf-basic-1.jpg",
			"/images/products/dtf-basic-2.jpg",
			"/images/products/dtf-basic-3.jpg"
		],
		category: "DTF-Transfers",
		specifications: {
			material: "Premium DTF Film",
			size: "A4 (210 x 297 mm)",
			colors: "Full Color CMYK",
			durability: "Waschbar bis 50°C",
			printArea: "Max. 200 x 280 mm",
			application: "Heißpresse bei 160°C",
			careInstructions: "30°C Wäsche, nicht bügeln"
		},
		inStock: true,
		tags: ["dtf", "transfer", "textile", "basic"],
		reviews: [
			{
				id: "1",
				author: "Maria Schmidt",
				rating: 5,
				comment: "Ausgezeichnete Qualität! Die Farben sind sehr lebendig und der Transfer hält perfekt.",
				date: "2024-01-15",
				verified: true
			},
			{
				id: "2",
				author: "Thomas Weber",
				rating: 4,
				comment: "Gute Qualität zu einem fairen Preis. Schnelle Lieferung.",
				date: "2024-01-10",
				verified: true
			}
		]
	},
	{
		id: "dtf-transfer-premium",
		slug: "dtf-transfer-premium",
		name: "DTF Transfer - Premium",
		shortDescription: "Premium DTF-Transfer mit erweiterten Eigenschaften für anspruchsvolle Projekte",
		description: "Unser Premium DTF-Transfer bietet die höchste Qualität für professionelle Anwendungen. Mit verbesserter Haftung, erweitertem Farbraum und längerer Haltbarkeit ist dieser Transfer ideal für kommerzielle Projekte und hochwertige Textilien.",
		price: 3.75,
		images: [
			"/images/products/dtf-premium-1.jpg",
			"/images/products/dtf-premium-2.jpg"
		],
		category: "DTF-Transfers",
		specifications: {
			material: "Premium DTF Film Pro",
			size: "A4 (210 x 297 mm)",
			colors: "Extended Color Gamut",
			durability: "Waschbar bis 60°C",
			printArea: "Max. 200 x 280 mm",
			application: "Heißpresse bei 160-170°C",
			careInstructions: "40°C Wäsche, schonend bügeln möglich"
		},
		inStock: true,
		tags: ["dtf", "transfer", "premium", "professional"],
		reviews: [
			{
				id: "3",
				author: "Lisa Müller",
				rating: 5,
				comment: "Absolut zufrieden! Die Premium-Variante ist jeden Cent wert.",
				date: "2024-01-20",
				verified: true
			}
		]
	},
	{
		id: "custom-print-service",
		slug: "custom-print-service",
		name: "Individueller Druck-Service",
		shortDescription: "Maßgeschneiderte Drucklösungen für Ihre individuellen Designs",
		description: "Unser individueller Druck-Service ermöglicht es Ihnen, Ihre eigenen Designs auf verschiedene Textilien drucken zu lassen. Von kleinen Auflagen bis zu Großbestellungen - wir realisieren Ihre Vision.",
		price: 15.00,
		images: [
			"/images/products/custom-print-1.jpg",
			"/images/products/custom-print-2.jpg"
		],
		category: "Druck-Services",
		specifications: {
			material: "Nach Kundenwunsch",
			size: "Individuell",
			colors: "Full Color",
			durability: "Je nach Material",
			printArea: "Nach Design",
			application: "Professionelle Druckanlage"
		},
		inStock: true,
		tags: ["custom", "print", "service", "individual"],
		reviews: []
	},
	{
		id: "dtf-transfer-freie-groesse",
		slug: "dtf-transfer-freie-groesse",
		name: "DTF Transfer Freigröße",
		shortDescription: "Individuell gestaltbare DTF-Transfers in freier Größe - perfekt für einzigartige Designs",
		description: "Unsere DTF-Transfers in Freigröße bieten Ihnen maximale Flexibilität für Ihre kreativen Projekte. Sie bestimmen die Größe und das Design - wir liefern höchste Qualität. Ideal für individuelle Motive, Logos oder künstlerische Designs auf Textilien aller Art. Die professionelle DTF-Technologie garantiert brillante Farben, feine Details und hervorragende Waschbeständigkeit.",
		price: 1.80,
		images: [
			"/images/products/dtf-freesize-1.jpg",
			"/images/products/dtf-freesize-2.jpg",
			"/images/products/dtf-freesize-3.jpg"
		],
		category: "DTF-Transfers",
		specifications: {
			material: "Premium DTF Film",
			size: "Freie Größe (nach Kundenwunsch)",
			colors: "Full Color CMYK + Weiß",
			durability: "Waschbar bis 60°C",
			printArea: "Individuell konfigurierbar",
			application: "Heißpresse bei 160-165°C für 10-15 Sekunden",
			careInstructions: "Maschinenwäsche bei 40°C, auf links waschen, nicht direkt bügeln"
		},
		inStock: true,
		tags: ["dtf", "transfer", "freesize", "custom", "individuell"],
		reviews: [
			{
				id: "4",
				author: "Stefan Bauer",
				rating: 5,
				comment: "Perfekt für meine individuellen Designs! Die Qualität ist ausgezeichnet und die freie Größenwahl ist genial.",
				date: "2024-01-25",
				verified: true
			},
			{
				id: "5",
				author: "Anna Klein",
				rating: 5,
				comment: "Tolle Farbbrillanz und sehr gute Haftung. Genau das, was ich gesucht habe!",
				date: "2024-01-18",
				verified: true
			}
		]
	},
	{
		id: "blockout-dtf-transfer-freie-groesse",
		slug: "blockout-dtf-transfer-freie-groesse",
		name: "Blockout DTF Transfer Freigröße",
		shortDescription: "Premium Blockout DTF-Transfer in freier Größe - perfekt für dunkle Textilien",
		description: "Unser Blockout DTF-Transfer in Freigröße ist die perfekte Lösung für Drucke auf dunklen und farbigen Textilien. Die spezielle Blockout-Schicht verhindert, dass die Farbe des Untergrunds durchscheint, und sorgt für brillante, deckende Farben auch auf schwarzen Stoffen. Ideal für professionelle Anwendungen, wo höchste Farbdeckung und Qualität gefordert sind. Sie bestimmen die Größe - wir liefern Premium-Qualität mit maximaler Deckkraft.",
		price: 2.20,
		images: [
			"/images/products/blockout-freesize-1.jpg",
			"/images/products/blockout-freesize-2.jpg",
			"/images/products/blockout-freesize-3.jpg"
		],
		category: "Blockout DTF",
		specifications: {
			material: "Premium Blockout DTF Film",
			size: "Freie Größe (nach Kundenwunsch)",
			colors: "Full Color CMYK + Weiß + Blockout-Schicht",
			durability: "Waschbar bis 60°C, besonders abriebfest",
			printArea: "Individuell konfigurierbar",
			application: "Heißpresse bei 165-170°C für 15 Sekunden",
			careInstructions: "Maschinenwäsche bei 40-60°C, auf links waschen, nicht direkt bügeln"
		},
		inStock: true,
		tags: ["dtf", "blockout", "freesize", "dark-fabrics", "premium"],
		reviews: [
			{
				id: "6",
				author: "Michael Schneider",
				rating: 5,
				comment: "Die Blockout-Qualität ist beeindruckend! Endlich perfekte Drucke auf schwarzen T-Shirts ohne Durchscheinen.",
				date: "2024-01-22",
				verified: true
			},
			{
				id: "7",
				author: "Julia Wagner",
				rating: 5,
				comment: "Absolute Premium-Qualität! Die Farben leuchten auch auf dunklen Stoffen perfekt.",
				date: "2024-01-16",
				verified: true
			},
			{
				id: "8",
				author: "Robert Fischer",
				rating: 4,
				comment: "Sehr gute Deckkraft und Haltbarkeit. Etwas teurer, aber das ist es wert.",
				date: "2024-01-12",
				verified: true
			}
		]
	}
];

export function getProductBySlug(slug: string): Product | undefined {
	return products.find(product => product.slug === slug);
}

export function getRelatedProducts(currentSlug: string, limit: number = 3): Product[] {
	return products
		.filter(product => product.slug !== currentSlug)
		.slice(0, limit);
}
