/**
 * Theme page metadata for Textilthemen, Sportbekleidung, and Arbeitskleidung.
 * Used by dynamic routes to render title/description and breadcrumbs.
 */

export interface ThemeMetric {
	icon: string; // Lucide icon name
	label: string;
	value: string;
	description: string;
}

export interface ThemeFAQ {
	question: string;
	answer: string;
}

export interface ThemeData {
	title: string;
	description: string;
	metrics?: ThemeMetric[];
	faqs?: ThemeFAQ[];
}

export const textilthemenSlugs: Record<string, ThemeData> = {
	't-shirts-bedrucken': {
		title: 'T-Shirts bedrucken',
		description: 'Professioneller T-Shirt-Druck: Siebdruck, DTF, Sublimation und Stickerei. Individuelle Motive, kleine und große Auflagen. Jetzt Angebot anfragen.',
	},
	'schuerzen-besticken': {
		title: 'Schürzen besticken',
		description: 'Schürzen besticken und bedrucken für Gastronomie, Handwerk und Events. Logo, Namen oder Motive – hochwertig und haltbar.',
	},
	'kappen-veredeln': {
		title: 'Kappen veredeln',
		description: 'Kappen und Caps bedrucken oder besticken. Ideal für Werbekappen, Vereine und Events. Große Auswahl an Modellen.',
	},
	'baumwolltaschen-bedrucken': {
		title: 'Baumwolltaschen bedrucken',
		description: 'Baumwolltaschen und Jutebeutel bedrucken. Nachhaltige Werbeträger mit Ihrem Logo. DTF, Siebdruck oder Flex.',
	},
	'muetzen-besticken': {
		title: 'Mützen besticken',
		description: 'Mützen besticken mit Logo oder Schriftzug. Hochwertige Stickerei für Vereine, Firmen und Events.',
	},
	'softshelljacken-besticken': {
		title: 'Softshelljacken besticken',
		description: 'Softshelljacken besticken und bedrucken. Professionelle Veredelung für Arbeitskleidung und Sport.',
	},
	'schal-besticken': {
		title: 'Schal besticken',
		description: 'Schals und Tücher besticken oder bedrucken. Ideal für Vereine, Events und Werbegeschenke.',
	},
	'handtuecher-besticken': {
		title: 'Handtücher besticken',
		description: 'Handtücher besticken mit Logo oder Monogramm. Hotel, Spa, Verein oder Werbegeschenk.',
	},
	'bandshirts-drucken': {
		title: 'Bandshirts drucken',
		description: 'Bandshirts und Merch drucken. T-Shirts, Hoodies und mehr für Bands und Künstler. Kleine Auflagen möglich.',
	},
	'fanwear-sv-darmstadt-98': {
		title: 'Fanwear SV Darmstadt 98',
		description: 'Fanwear und Trikots für SV Darmstadt 98. Individuelle Bedruckung und Veredelung für Lilien-Fans.',
	},
	'modelabel-gruenden': {
		title: 'Modelabel gründen',
		description: 'Textilveredelung für Ihr Modelabel: Bedrucken, Besticken, kleine Serien. Professionelle Qualität für Ihre Kollektion.',
	},
};

export const sportbekleidungSlugs: Record<string, ThemeData> = {
	'laufshirts-bedrucken': {
		title: 'Laufshirts bedrucken',
		description: 'Laufshirts bedrucken für Läufe, Marathons und Vereine. Atmungsaktiv, schnell trocknend, mit Ihrem Logo.',
		metrics: [
			{ icon: 'Wind', label: 'Atmungsaktiv', value: '100%', description: 'Hoher Tragekomfort' },
			{ icon: 'Zap', label: 'Trocknung', value: 'Schnell', description: 'Feuchtigkeitsregulierend' },
			{ icon: 'Feather', label: 'Gewicht', value: 'Leicht', description: 'Kaum spürbar' },
		],
		faqs: [
			{ question: 'Welches Material ist am besten für Laufshirts?', answer: 'Für Laufshirts empfehlen wir atmungsaktive Polyester-Funktionsfasern. Diese transportieren Schweiß nach außen und trocknen schnell. Baumwolle saugt sich voll und ist daher weniger geeignet.' },
			{ question: 'Kann ich Laufshirts mit individuellen Namen bedrucken?', answer: 'Ja, wir können jedes Shirt mit einem individuellen Namen oder einer Startnummer personalisieren – ideal für Firmenläufe und Teams.' },
			{ question: 'Wie wasche ich bedruckte Laufshirts richtig?', answer: 'Waschen Sie Funktionsshirts bei 30-40°C ohne Weichspüler. Drehen Sie das Textil auf links, um den Druck zu schonen. Nicht in den Trockner geben.' },
		]
	},
	'laufshirts-komplett-bedrucken': {
		title: 'Laufshirts komplett bedrucken',
		description: 'Laufshirts komplett bedrucken – Vollfläche oder großflächige Motive. Ideal für Events und Teams.',
		metrics: [
			{ icon: 'Palette', label: 'Design', value: 'All-Over', description: 'Randlos bedruckbar' },
			{ icon: 'Droplets', label: 'Farben', value: 'Unbegrenzt', description: 'Foto-realistisch' },
			{ icon: 'Shield', label: 'Haltbarkeit', value: 'Permanent', description: 'Dampf-fixiert' },
		],
		faqs: [
			{ question: 'Was bedeutet "komplett bedrucken"?', answer: 'Beim Sublimationsverfahren wird der Stoff vor dem Nähen komplett eingefärbt. So sind Designs über die gesamte Fläche (Ärmel, Rücken, Front) ohne Ränder möglich.' },
			{ question: 'Ist der Druck spürbar?', answer: 'Nein. Bei der Sublimation dampft die Farbe direkt in die Faser ein. Der Stoff bleibt weich, atmungsaktiv und man spürt keinen Aufdruck.' },
			{ question: 'Gibt es eine Mindestbestellmenge?', answer: 'Für All-Over-Designs produzieren wir oft schon ab kleinen Mengen (z.B. 10 Stück), da der Zuschnitt individuell erfolgt. Fragen Sie uns einfach an!' },
		]
	},
	'trikots-bedrucken': {
		title: 'Trikots bedrucken',
		description: 'Trikots bedrucken: Nummern, Namen, Sponsorenlogos. Für Fußball, Handball, Hockey und mehr.',
		metrics: [
			{ icon: 'Users', label: 'Team-Rabatt', value: 'Ja', description: 'Ab 10 Stück' },
			{ icon: 'Timer', label: 'Lieferzeit', value: 'Schnell', description: 'Pünktlich zum Spiel' },
			{ icon: 'Shield', label: 'Robust', value: 'Reißfest', description: 'Für Zweikämpfe' },
		],
		faqs: [
			{ question: 'Können wir Trikots verschiedener Größen mischen?', answer: 'Selbstverständlich. Sie können Größen und Schnitte (Damen/Herren/Kinder) beliebig mischen und trotzdem vom Mengenrabatt profitieren.' },
			{ question: 'Wie lange halten die Rückennummern?', answer: 'Wir verwenden hochwertigen Flex- oder Plastisoldruck, der extrem dehnbar und waschbeständig ist. Bei richtiger Pflege halten die Nummern jahrelang.' },
			{ question: 'Können wir Sponsorenlogos mehrfarbig drucken?', answer: 'Ja, mit DTF-Transferdruck können wir auch komplexe, mehrfarbige Sponsorenlogos kostengünstig und haltbar aufbringen.' },
		]
	},
	'fahrradtrikot-bedrucken': {
		title: 'Fahrradtrikot Bedrucken',
		description: 'Fahrradtrikots bedrucken für Vereine, Radteams und Events. Professionelle Veredelung auf Funktionsstoff.',
		metrics: [
			{ icon: 'Wind', label: 'Aero', value: 'Schnitt', description: 'Körpernah & schnell' },
			{ icon: 'Sun', label: 'UV-Schutz', value: '50+', description: 'Schützt vor Sonne' },
			{ icon: 'Pocket', label: 'Taschen', value: '3-Teilig', description: 'Rückentaschen inkl.' },
		],
		faqs: [
			{ question: 'Haben die Trikots einen Reißverschluss?', answer: 'Ja, wir bieten Modelle mit kurzem, 3/4 oder durchgehendem Reißverschluss (Full-Zip) an.' },
			{ question: 'Eignet sich der Druck für Lycra/Elasthan?', answer: 'Absolut. Wir nutzen spezielle dehnbare Transfers oder Sublimation, die bei Dehnung des Stoffes nicht reißen.' },
		]
	},
	'poloshirts-komplett-bedrucken': {
		title: 'Poloshirts komplett bedrucken',
		description: 'Poloshirts komplett bedrucken für Firmen, Vereine und Events. Große Motive, hohe Qualität.',
		metrics: [
			{ icon: 'Award', label: 'Look', value: 'Premium', description: 'Kragen & Knopfleiste' },
			{ icon: 'Layers', label: 'Material', value: 'Piqué', description: 'Oder Funktionsfaser' },
			{ icon: 'Briefcase', label: 'Einsatz', value: 'Business', description: 'Messe & Büro' },
		],
		faqs: [
			{ question: 'Kann man Poloshirts auch besticken?', answer: 'Ja, Poloshirts eignen sich hervorragend für Stickerei, besonders auf der Brust oder dem Kragen. Das wirkt besonders hochwertig.' },
			{ question: 'Sind die Polos bügelfrei?', answer: 'Viele unserer Funktions-Polos sind bügelfrei ("Easy Care"). Baumwoll-Piqué sollte leicht gebügelt werden.' },
		]
	},
	'esport-teamware': {
		title: 'eSport Teamware',
		description: 'eSport Teamware bedrucken: Jerseys, Hoodies, Caps mit Team-Logo und Sponsoring. Kleine Auflagen.',
		metrics: [
			{ icon: 'Monitor', label: 'Gaming', value: 'Ready', description: 'Bequemer Schnitt' },
			{ icon: 'Zap', label: 'Design', value: 'Futuristisch', description: 'Neon & Verläufe' },
			{ icon: 'MousePointer', label: 'Namen', value: 'Gamertag', description: 'Individuell' },
		],
		faqs: [
			{ question: 'Können wir unsere Gamertags aufdrucken?', answer: 'Ja, das ist Standard im eSport. Jeder Spieler bekommt seinen eigenen Gamertag auf den Rücken oder die Brust.' },
			{ question: 'Macht ihr auch Designs für uns?', answer: 'Wenn ihr grobe Ideen habt, hilft unsere Grafikabteilung gerne bei der Finalisierung des Trikot-Designs.' },
		]
	},
	'eishockey-shirts': {
		title: 'Eishockey Shirts',
		description: 'Eishockey Shirts und Trikots bedrucken. Nummern, Namen und Logos für Vereine und Mannschaften.',
		metrics: [
			{ icon: 'Minimize2', label: 'Schnitt', value: 'Oversize', description: 'Passt über Ausrüstung' },
			{ icon: 'Activity', label: 'Stoff', value: 'Mesh', description: 'Belüftungseinsätze' },
			{ icon: 'Shield', label: 'Robust', value: 'Heavy', description: 'Hält Checks stand' },
		],
		faqs: [
			{ question: 'Sind die Trikots "Fight Strap" kompatibel?', answer: 'Auf Wunsch können wir Trikots mit Fight Straps (Kampfriemen) liefern.' },
			{ question: 'Wie groß müssen die Nummern sein?', answer: 'Wir halten uns an die gängigen Verbandsvorgaben (z.B. 25-30cm Rückenhöhe).' },
		]
	},
	'hoodies-komplett-bedruckt': {
		title: 'Hoodies komplett bedruckt',
		description: 'Hoodies komplett bedruckt für Events, Vereine und Merch. Großflächige Motive, hohe Qualität.',
		metrics: [
			{ icon: 'Thermometer', label: 'Wärme', value: 'Cozy', description: 'Innen angeraut' },
			{ icon: 'Layers', label: 'Grammatur', value: '300gr', description: 'Schwere Qualität' },
			{ icon: 'Maximize', label: 'Print', value: 'XL', description: 'Über Nähte möglich' },
		],
		faqs: [
			{ question: 'Kann man auch auf der Kapuze drucken?', answer: 'Ja, bei "komplett bedruckt" (All-Over) oder auch im Siebdruck ist ein Druck auf der Kapuze problemlos möglich.' },
			{ question: 'Gehen die Hoodies beim Waschen ein?', answer: 'Unsere Textilien sind meist vorgeschrumpft. Bei Beachtung der Pflegehinweise behalten sie ihre Form.' },
		]
	},
	'trainingsjacken-komplett-bedruckt': {
		title: 'Trainingsjacken komplett bedruckt',
		description: 'Trainingsjacken komplett bedruckt. Ideal für Vereine, Fitnessstudios und Firmen.',
		metrics: [
			{ icon: 'Sliders', label: 'Reißverschluss', value: 'Full-Zip', description: 'Stabil & leicht' },
			{ icon: 'Activity', label: 'Funktion', value: 'Sport', description: 'Vor & nach dem Training' },
			{ icon: 'Users', label: 'Einheitlich', value: 'Team', description: 'Identischer Look' },
		],
		faqs: [
			{ question: 'Gibt es passende Hosen dazu?', answer: 'Ja, wir können komplette Trainingsanzüge (Jacke + Hose) im einheitlichen Design liefern.' },
		]
	},
	'business-runs-firmenlauf': {
		title: 'Business Runs & Firmenläufe',
		description: 'Textilbedruckung für Business Runs und Firmenläufe. Laufshirts, Startnummern und Team-Outfits.',
		metrics: [
			{ icon: 'Briefcase', label: 'Firmen', value: 'CI-Konform', description: 'Pantone-genau' },
			{ icon: 'Clock', label: 'Express', value: 'Möglich', description: 'Last-Minute Service' },
			{ icon: 'TrendingUp', label: 'Marketing', value: 'Sichtbar', description: 'Großes Logo' },
		],
		faqs: [
			{ question: 'Wir brauchen die Shirts sehr kurzfristig. Geht das?', answer: 'Oft ja. Melden Sie sich sofort telefonisch. Wir haben Express-Optionen für eilige Termine.' },
			{ question: 'Kann man verschiedene Logos (Sponsoren) drucken?', answer: 'Ja, wir können beliebig viele Sponsorenlogos auf Rücken, Ärmel oder Brust platzieren.' },
		]
	},
	'rucksackbeutel-komplett-bedruckt': {
		title: 'Rucksackbeutel komplett bedruckt',
		description: 'Rucksackbeutel und Sporttaschen komplett bedrucken. Für Events, Vereine und Werbegeschenke.',
		metrics: [
			{ icon: 'ShoppingBag', label: 'Volumen', value: '12L', description: 'Viel Stauraum' },
			{ icon: 'Feather', label: 'Material', value: 'Robust', description: 'Wasserabweisend' },
			{ icon: 'Tag', label: 'Preis', value: 'Günstig', description: 'Ideal als Give-Away' },
		],
		faqs: [
			{ question: 'Sind die Kordeln stabil?', answer: 'Wir verwenden dicke, geflochtene Kordeln, die nicht einschneiden und lange halten.' },
		]
	},
};

export const arbeitskleidungKasacks = {
	title: 'Kasacks / Medizinische Berufsbekleidung',
	description: 'Kasacks und medizinische Berufsbekleidung besticken und bedrucken. Logo, Name oder Klinik-Design. Pflegeleicht und haltbar.',
};
