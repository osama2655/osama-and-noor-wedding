// Static content. The plan text itself (Groom's Battle Plan v2). Only state
// (checks, vendor rows, payments) lives in the database; this structure is
// fixed and shared by both users.

export const WED_DEFAULT = '2026-08-14'

// Owner tags used across CHECKLIST and LANES.
// you  = the groom
// men  = groom + brother + Hashim (men's side, both days)
// her  = the bride's side
// hall = the all-inclusive venue
export const OWNERS = {
  you: 'You',
  men: 'You + brother + Hashim',
  her: 'Her side',
  hall: 'The hall',
}

// Hard facts. Nothing here is up for debate.
export const FACTS = [
  ['Format', 'Segregated, traditional. About 200 guests, hard cap.'],
  [
    'Venue',
    'One all-inclusive hall. It handles theme, decor, flowers, stage, DJ, catering, and on-site coordination.',
  ],
  ['Event budget', 'BD 1000 to 1200 total.'],
  ['Gold', 'BD 2000, separate from the event budget. You buy it.'],
  [
    'Mahr',
    'The two mothers set the figure. Stay out of it. You just need the final number before the Milcha.',
  ],
  [
    'Structure',
    "Two days. Day A: Milcha in the day, Henna night at night. Day B: the reception, women's reception plus men's majlis.",
  ],
]

export const CHECKLIST = [
  {
    id: 'p1',
    title: 'NOW to Day 28',
    sub: 'Lock the big rocks',
    items: [
      [
        'Call the 3 halls, compare all-inclusive quotes, book one with a deposit. Confirm segregated layout and both dates in writing.',
        'you',
      ],
      [
        "Confirm the Milcha date, the ma'thoon, and the exact document list.",
        'you',
      ],
      [
        'Lock photo and video through Ahmed, with female coverage confirmed.',
        'you',
      ],
      ['Book the HMUA and the trial.', 'her'],
      [
        'Confirm the henna artist and where the henna night happens, hall or home.',
        'her',
      ],
      ['Order the thobe and bisht, or the suit. Tailoring starts now.', 'you'],
      ['Buy the gold, BD 2000. Let the mothers settle the mahr.', 'you'],
      ['Stand up the RSVP website. Collect both guest lists, cap 200.', 'you'],
      ['Open the payments tracker.', 'you'],
    ],
  },
  {
    id: 'p2',
    title: 'Day 27 to 20',
    sub: 'Hand the design to the hall, book the rest',
    items: [
      [
        'With the hall, set theme and colour, menu (the buffet tier drives the budget), kosha, DJ, and timing for both days.',
        'hall',
      ],
      ['Order the cake.', 'you'],
      [
        "Confirm the men's side plan with brother and Hashim: gahwa and dates supplier, seating, greeting order.",
        'men',
      ],
      [
        'Send invites, digital plus WhatsApp, with the RSVP link to the site.',
        'you',
      ],
      ['Wedding car and transport (reminder Day 18).', 'you'],
      [
        'Honeymoon: check Citi leave, book if movable, otherwise leave pending.',
        'you',
      ],
      ['Passports valid 6 or more months if the honeymoon is on.', 'you'],
    ],
  },
  {
    id: 'p3',
    title: 'Day 19 to 11',
    sub: 'Confirm, fit, build the runsheet',
    items: [
      ['HMUA trial done, the look locked.', 'her'],
      ['Your attire fitted and collected.', 'you'],
      ['Firm headcount to the hall by their deadline.', 'you'],
      [
        'Build the two-day runsheet and share it with the hall, photographer, and DJ.',
        'you',
      ],
      ['Pay the balances due, schedule the rest.', 'you'],
      ["Confirm men's side supplies: gahwa, dates, seating.", 'men'],
    ],
  },
  {
    id: 'gate',
    title: 'DAY 10 GATE',
    sub: 'Ten days out, everything below must be TRUE',
    gate: true,
    items: [
      [
        'Hall, photo and video, HMUA, henna, and cake all booked, paid, and timed in writing.',
        'you',
      ],
      ['Attire collected.', 'you'],
      ['Milcha date confirmed and documents in hand.', 'you'],
      ['Final headcount given, 200 or under.', 'you'],
      ['Two-day runsheet shared with every vendor.', 'you'],
      ['Honeymoon resolved, booked or deferred.', 'you'],
      ['Tracker at zero urgent open items.', 'you'],
    ],
  },
  {
    id: 'p5',
    title: 'Last 10 days',
    sub: 'Calm mode, confirm and be present',
    items: [
      ['Reconfirm every vendor 48 to 72 hours ahead.', 'you'],
      [
        'Cash tips in labeled envelopes. Assign someone to carry the rings, gold, and documents.',
        'you',
      ],
      ['Haircut about 3 days before.', 'you'],
      [
        'Pack the honeymoon and wedding-night bags, attire plus a backup, chargers, and docs.',
        'you',
      ],
      ["Brief brother and Hashim on their men's side duties.", 'men'],
      ['Protect your sleep and routine.', 'you'],
    ],
  },
]

// Still-open items that ride alongside the checklist.
export const OPEN_ITEMS = [
  ['Honeymoon', 'Gated on Citi leave. Decide by Day 20.', 'you'],
  ['Wedding car', 'Reminder at Day 18.', 'you'],
  [
    'Mahr',
    'The mothers decide. You need the final figure before the Milcha.',
    'you',
  ],
]

export const LANES = [
  {
    title: 'YOU, fully',
    tag: 'you',
    note: 'You own these end to end. Report progress, do not hand them off.',
    items: [
      'Venue selection and contract.',
      "Milcha logistics and documents (ma'thoon, IDs, the full list).",
      'Your attire: thobe and bisht, or a suit.',
      'The gold, BD 2000.',
      'The payments tracker.',
      'Honeymoon, pending leave from Citi.',
      'The day-of runsheet.',
      'Being the calm coordinator.',
    ],
  },
  {
    title: "MEN'S SIDE, both days",
    tag: 'men',
    note: 'You, your brother, and Hashim run this together.',
    items: [
      "The men's majlis on Day B: gahwa, dates, lighter food.",
      'Seating and the greeting order.',
      'Receiving and looking after the men both days.',
      'Gahwa and dates supplier.',
    ],
  },
  {
    title: 'HER SIDE',
    tag: 'her',
    note: 'Support it, do not take it over. Pay deposits on time and clear the admin.',
    items: [
      'The dress.',
      'HMUA (hair and makeup) and the trial.',
      "The henna night (women-led, bride's side).",
      'Her guest list.',
      'Bridal prep.',
    ],
  },
  {
    title: 'THE HALL',
    tag: 'hall',
    note: 'All-inclusive. This absorbs roughly 60 percent of the work once booked.',
    items: [
      'Theme and decor.',
      'Flowers.',
      'The stage and kosha.',
      'Sound and DJ.',
      'Catering.',
      'On-site coordination.',
    ],
  },
]

export const VENUES = [
  {
    n: 'The Heaven',
    area: 'Dumistan',
    phone: '+973 3909 0080',
    note: 'Best all-inclusive fit. Start here.',
    startHere: true,
  },
  {
    n: 'Al Dana Hall',
    area: 'Maqabah',
    phone: '+973 1769 5005',
    note: 'Two halls, so you can run men and women in parallel. Best on budget.',
    startHere: false,
  },
  {
    n: 'New Seasons Hall',
    area: 'Adhari',
    phone: '+973 1740 4141',
    note: 'Around 200 capacity, native split between the two sides.',
    startHere: false,
  },
]

export const VENUE_BACKUPS = [
  { n: 'Alnaseej', phone: '+973 3331 2881' },
  { n: 'Nayyara (Amwaj)', phone: '+973 3382 0333' },
]

export const ASK_EVERY_HALL = [
  'Is the price all-inclusive, and what exactly does it cover (theme, decor, flowers, stage and kosha, sound and DJ, catering, coordination)?',
  "Can you hold a fully segregated layout, and can you run the women's reception and the men's majlis at the same time?",
  'Are both of our dates available, and will you put them in writing on the deposit?',
  'What is the per-head cost, and which buffet tier keeps us inside BD 1000 to 1200 total?',
  'What is the real capacity, and can you seat about 200 without crowding?',
  'What deposit do you need, and what is the payment and cancellation schedule?',
  'Who is our on-site coordinator on the day, and what do they handle?',
  "Can outside photo and video teams (including a female crew for the women's side) work in the hall?",
]

export const PHOTOVIDEO = {
  requirement:
    "Segregated event means a female photo and video team is a hard requirement, either a female crew or a company that fields a female crew for the women's events plus a male crew for the men's majlis. Coverage must span both days. Do not book until female coverage is confirmed.",
  sourcedVia: 'Ahmed',
  days: [
    'Day A: Milcha and Henna night',
    "Day B: women's reception and men's majlis",
  ],
}

export const RESOURCES = [
  {
    h: 'Directories and guides',
    items: [
      [
        'bahrainislandwedding.com, official Bahrain Tourism directory',
        'https://bahrainislandwedding.com',
      ],
      [
        'arabiaweddings.com, regional directory with strong Bahrain sections',
        'https://arabiaweddings.com',
      ],
      [
        'weddingsinbahrain.com, local venue and vendor guide',
        'https://weddingsinbahrain.com',
      ],
      [
        'localbh.com, crowd-sourced local recommendations',
        'https://localbh.com',
      ],
    ],
  },
]

export const STARTER_VENDORS = [
  'Venue (all-inclusive hall)',
  'Photo and video (female coverage confirmed)',
  'HMUA (hair and makeup)',
  'Henna artist',
  'Cake',
  "Gahwa and dates supplier (men's majlis)",
  'Wedding car and transport',
  'Your attire (thobe and bisht)',
  'Honeymoon',
]

export const STATUS = {
  todo: 'Not started',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked (deposit paid)',
  paid: 'Paid in full',
}
export const STATUS_CLASS = {
  todo: 's-todo',
  contacted: 's-contacted',
  quoted: 's-quoted',
  booked: 's-booked',
  paid: 's-paid',
}
