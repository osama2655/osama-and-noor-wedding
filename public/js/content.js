// Static content — the plan text itself. Only *state* (checks, answers, vendor rows…) lives in
// the database; this structure is fixed and shared by both users.

export const WED_DEFAULT = '2026-08-14'

export const DECISIONS = [
  {
    q: 'Milcha / Nikah done, or part of this event?',
    d: 'In Bahrain the contract is often signed separately/earlier. If not done, this is priority #1.',
  },
  {
    q: 'Mixed or segregated?',
    d: "Decides the whole floor plan, entertainment, and whether you need two spaces. Both families' comfort, not just you two.",
  },
  {
    q: 'One night or a sequence?',
    d: "Henna night + main reception is the common combo. Sometimes a separate men's majlis/walima.",
  },
  {
    q: 'Guest count — firm number?',
    d: 'Venues price per head, so this drives budget more than anything.',
  },
  {
    q: 'Who pays what?',
    d: "Groom's side traditionally carries the walima + a large share; many Manama couples split. Get it explicit with both families now, in writing.",
  },
  { q: 'Budget ceiling?', d: 'Total, and per-head for the venue.' },
  {
    q: 'Style / theme?',
    d: "Noor almost certainly has this — your job is to know it so you don't buy off-brand.",
  },
  {
    q: 'Honeymoon: yes / now / later?',
    d: 'Affects passports, leave from Citi, and booking timing.',
  },
]

export const CHECKLIST = [
  {
    id: 'w1',
    title: 'Week 1 — Days 34→28',
    sub: 'Lock the big rocks',
    items: [
      ['Complete the 8 decisions (Section: 8 Decisions)', 'shared'],
      [
        "Confirm Milcha/Nikah status; if not done, book the ma'thoon/court date + gather docs (IDs/passports, certificates — confirm list with MoJ/Islamic Affairs or your ma'thoon)",
        'you',
      ],
      [
        'Confirm venue, date, guest count, per-head price + what package includes (menu, décor, tables, sound, parking, honeymoon suite)',
        'shared',
      ],
      ['Hire a planner/coordinator (or assign yourself as lead)', 'you'],
      ['Book photographer + videographer (deposit)', 'shared'],
      ['Book HMUA (bridal hair & makeup) + trial date', 'her'],
      ['Book henna artist + confirm henna night date/venue', 'her'],
      ['Order your thobe/bisht or suit — start tailoring now', 'you'],
      ['Confirm mahr + gold plan with her family', 'you'],
      ['Draft guest list (both sides) in one shared sheet', 'shared'],
      ['Set up the master vendor + payments tracker', 'you'],
    ],
  },
  {
    id: 'w2',
    title: 'Week 2 — Days 27→20',
    sub: 'Design + book the rest',
    items: [
      ['Finalize décor, flowers, and kosha/stage design', 'shared'],
      [
        'Finalize catering menu + tasting (ghouzi/roast lamb, machboos, buffet, dessert)',
        'shared',
      ],
      ['Order the cake', 'shared'],
      [
        'Book entertainment: DJ/band and/or ardha/tabl drummers (respect mixed-vs-segregated)',
        'shared',
      ],
      [
        'Send invitations — digital invite + WhatsApp broadcast is standard; printed cards only if she wants',
        'shared',
      ],
      ['Book wedding car / transport', 'you'],
      ['Her dress: confirm final fitting dates', 'her'],
      [
        'Book honeymoon (flights + hotel); file leave at Citi; check passport validity (6+ months)',
        'you',
      ],
      ['Confirm accommodation for out-of-town guests / honeymoon suite', 'you'],
    ],
  },
  {
    id: 'w3',
    title: 'Week 3 — Days 19→11',
    sub: 'Confirm + fit + rehearse',
    items: [
      ['HMUA trial done — lock the look', 'her'],
      ['Your attire fitting #1 done; alterations underway', 'you'],
      [
        'Collect RSVPs; give venue a firm headcount by their deadline',
        'shared',
      ],
      [
        'Build the day-of runsheet; share with planner, photographer, DJ, venue',
        'you',
      ],
      ['Confirm seating plan / any VIP or family seating', 'shared'],
      ['Pay vendor balances that are due; schedule the rest', 'you'],
      [
        'Buy: rings if not already, gifts for each other, guest favors if custom',
        'shared',
      ],
      ['Assign 2–3 point men for the night (family / vendors / you)', 'you'],
      [
        "Confirm henna night details (venue, women's guest list, artist arrival time)",
        'her',
      ],
    ],
  },
  {
    id: 'gate',
    title: '🚩 DAY −10 GATE',
    sub: 'Everything below must be TRUE',
    gate: true,
    items: [
      [
        'Venue, caterer, photo/video, HMUA, henna, décor, cake, car, entertainment: all booked, deposits paid, times confirmed in writing',
        'shared',
      ],
      [
        'Your attire fitted & collected (or pickup date set inside final 10 days)',
        'you',
      ],
      [
        'Marriage contract done or firmly scheduled with documents ready',
        'you',
      ],
      ['Final headcount given to venue', 'shared'],
      ['Day-of runsheet shared with every vendor', 'you'],
      ['Honeymoon booked, leave approved, passports valid', 'you'],
      ['Master tracker shows no open urgent items', 'you'],
    ],
  },
  {
    id: 'final',
    title: 'Days −10 → −1',
    sub: "Calm mode — confirm, don't build",
    items: [
      [
        'Reconfirm every vendor 48–72h ahead (arrival time, contact, deliverable)',
        'you',
      ],
      ['Pay remaining balances; prep cash tips in labeled envelopes', 'you'],
      [
        'Pack: honeymoon bag, wedding-night bag, attire + backup, chargers, documents, rings',
        'shared',
      ],
      ['Grooming: haircut ~3 days before (not day-of)', 'you'],
      ['Assign someone to carry rings, mahr, and documents on the day', 'you'],
      ['Charge phones/cameras; download the runsheet offline', 'you'],
      ['Protect your sleep and routine', 'shared'],
    ],
  },
  {
    id: 'day0',
    title: 'Day 0 — the day',
    sub: 'Be in it',
    items: [
      ['Eat and hydrate before the event', 'you'],
      ['Point men briefed and on duty', 'you'],
      [
        'Hand off logistics to planner/point men and actually be present',
        'shared',
      ],
    ],
  },
]

export const LANES = [
  {
    title: 'YOUR lanes — own fully',
    tag: 'you',
    note: "Report progress; don't ask her to manage these.",
    items: [
      'Your attire — thobe + gutra/bisht or bisht, or a suit if Western-style. Start tailoring Week 1.',
      "The mahr + gold — coordinate with her family on what's expected and when it's presented.",
      "Men's side coordination — seating, greeting line, who receives guests, ardha/tabl or DJ.",
      'Wedding car / transport — for you both + family logistics on the night.',
      'Honeymoon — flights, hotel, leave at Citi, travel docs.',
      'Your guest list + RSVPs — you chase your side.',
      'Vendor chasing / payments tracker — hold the master list + deposit deadlines.',
      'Day-of logistics + the minute-by-minute runsheet.',
    ],
  },
  {
    title: 'SHARED — decide together, one executes',
    tag: 'shared',
    note: '',
    items: [
      'Venue details',
      'Décor & flowers',
      'The kosha / stage',
      'Catering menu',
      'Cake',
      'Invitations',
      'Photography style',
      'Entertainment',
      'Guest list master',
    ],
  },
  {
    title: "HER lanes — support, don't take over",
    tag: 'her',
    note: 'Your role: pay deposits on time, drive her to fittings/trials, remove admin friction.',
    items: [
      'Bridal dress + fittings',
      'Hair & makeup (HMUA)',
      'Henna night',
      'Bridal beauty prep',
      'Her guest list',
    ],
  },
]

export const SHORTLIST = [
  {
    cat: 'Wedding planners / coordinators',
    note: 'Worth it at 34 days — they compress weeks of work.',
    v: [
      {
        n: 'The Arch Events',
        h: '@thearchevents',
        u: 'https://instagram.com/thearchevents',
        extra: 'WhatsApp +973 33608868',
      },
      {
        n: 'Weddings & Events Co (Aseel Al-Ansari)',
        h: '@weddingsandeventsco',
        u: 'https://instagram.com/weddingsandeventsco',
      },
      {
        n: 'Directory (Divine, LalaBella, Leaves…)',
        u: 'https://bahrainislandwedding.com/en/wedding-planners',
        h: 'bahrainislandwedding.com',
      },
    ],
  },
  {
    cat: 'Venues',
    note: 'Hotel packages ~BD 12–25 net/person. If not booked, call first & ask for cancellations.',
    v: [
      { n: 'Gulf Hotel — Al Dana (~800) / Awal (100–300) / GCC terrace' },
      {
        n: 'Diplomat Radisson Blu — Grand Ambassador (~900) / Al Fanar Sea View (~200)',
      },
      { n: 'Four Seasons Bahrain Bay — ballrooms + private lawn' },
      { n: 'Ritz-Carlton — Al Ghazal (~500) + Masaya Pavilion' },
      { n: 'Sofitel Zallaq — Al Nakheel (~800), beachfront' },
      { n: 'InterContinental Regency — Al Rifaa (~500)' },
      { n: 'Crowne Plaza — renovated ballroom ~1,000 + LED wall' },
      {
        n: 'Also: Jumeirah, ART Rotana (Amwaj), Raffles Al Areen (~200), Mövenpick',
      },
    ],
  },
  {
    cat: 'Photography + videography',
    v: [
      {
        n: 'Studio Classic',
        h: '@scweddingbh',
        u: 'https://instagram.com/scweddingbh',
        extra: '+973 33024042',
      },
      {
        n: 'Bader & Khatoon',
        h: '@bkweddings',
        u: 'https://instagram.com/bkweddings',
      },
      {
        n: 'Junaid Moazzam',
        h: '@junaidmoazzamstudio',
        u: 'https://instagram.com/junaidmoazzamstudio',
      },
      {
        n: 'Nawal Photography',
        h: '@nawalphotography',
        u: 'https://instagram.com/nawalphotography',
      },
      { n: 'Zynnah', h: '@zynnah', u: 'https://instagram.com/zynnah' },
      {
        n: 'FM Videography',
        h: '@fm.videography',
        u: 'https://instagram.com/fm.videography',
      },
      {
        n: 'Glenn Dulay',
        h: '@glenndulay',
        u: 'https://instagram.com/glenndulay',
      },
      {
        n: 'Safiya Aloraibi',
        h: '@safiyaaloraibi',
        u: 'https://instagram.com/safiyaaloraibi',
      },
    ],
  },
  {
    cat: 'Décor · Cake · Entertainment · HMUA · Henna',
    note: 'Book the HMUA trial early — hardest slot to get.',
    v: [
      {
        n: 'Official vendor directory',
        u: 'https://bahrainislandwedding.com',
        h: 'bahrainislandwedding.com',
      },
      {
        n: 'Regional directory',
        u: 'https://arabiaweddings.com',
        h: 'arabiaweddings.com',
      },
      { n: 'IG search', h: "'Bahrain bridal makeup' · 'Bahrain henna artist'" },
    ],
  },
]

export const RESOURCES = [
  {
    h: 'Directories & guides',
    items: [
      [
        'bahrainislandwedding.com — official (Bahrain Tourism), vendors by category',
        'https://bahrainislandwedding.com',
      ],
      [
        'arabiaweddings.com — regional directory, strong Bahrain sections',
        'https://arabiaweddings.com',
      ],
      [
        'weddingsinbahrain.com — local venue/vendor guide',
        'https://weddingsinbahrain.com',
      ],
      ['bahrainweddings.com — local guide', 'https://bahrainweddings.com'],
      [
        'localbh.com — crowd-sourced local recommendations',
        'https://localbh.com',
      ],
      [
        'ohlala-magazine.com — venue write-ups with package details',
        'https://ohlala-magazine.com',
      ],
    ],
  },
  {
    h: 'Instagram to follow now',
    items: [
      ['Planners: @thearchevents', 'https://instagram.com/thearchevents'],
      [
        'Planners: @weddingsandeventsco',
        'https://instagram.com/weddingsandeventsco',
      ],
      ['Official: @bahrainwedding', 'https://instagram.com/bahrainwedding'],
      ['Photo/video: @scweddingbh', 'https://instagram.com/scweddingbh'],
      ['Photo/video: @bkweddings', 'https://instagram.com/bkweddings'],
      [
        'Photo/video: @junaidmoazzamstudio',
        'https://instagram.com/junaidmoazzamstudio',
      ],
      [
        'Search tags: #bahrainwedding #bahrainbride #عروس_البحرين',
        'https://instagram.com/explore/tags/bahrainwedding/',
      ],
    ],
  },
]

export const STARTER_VENDORS = [
  'Planner',
  'Venue',
  'Photo + video',
  'HMUA (hair & makeup)',
  'Henna artist',
  'Décor / flowers / kosha',
  'Catering / menu',
  'Cake',
  'Entertainment (DJ / ardha)',
  'Wedding car / transport',
  'Invitations',
  'Your attire (thobe/bisht)',
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
