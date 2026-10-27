import { Collection, PolicyDocument } from '../models';

// Synthetic policies for a fictional company, Brightwell Labs. Nothing here is real HR or legal advice.

export const COLLECTIONS: Collection[] = [
  { id: 'hr', name: 'People & HR', description: 'Leave, benefits, ways of working' },
  { id: 'it', name: 'IT & Security', description: 'Security, devices, AI tools' },
  { id: 'finance', name: 'Finance', description: 'Travel, expenses, budgets' },
  { id: 'legal', name: 'Legal & Compliance', description: 'Conduct, data, retention' },
];

interface Seed {
  id: string;
  title: string;
  collectionId: string;
  fileName: string;
  sizeKb: number;
  updatedAt: string;
  owner: string;
  sections: [heading: string, text: string][];
}

const SEEDS: Seed[] = [
  {
    id: 'handbook',
    title: 'Employee Handbook 2026',
    collectionId: 'hr',
    fileName: 'employee-handbook-2026.pdf',
    sizeKb: 1840,
    updatedAt: '2026-01-15',
    owner: 'People Team',
    sections: [
      ['Working hours', 'Our core collaboration hours are 10:00 to 16:00 local time, Monday to Friday. Outside core hours you can organise your day freely, as long as you work your contracted hours. Overtime must be agreed in advance with your manager and is compensated with time off.'],
      ['Paid time off', 'Full-time employees get 25 days of paid time off per calendar year, plus public holidays. Part-time employees get a pro-rated amount. Request time off in the HR portal at least two weeks ahead for absences longer than three days.'],
      ['Carrying over time off', 'You can carry over up to 5 unused days of paid time off into the next year. Carried-over days must be used by 31 March; after that date they expire. Days above the limit are not paid out unless local law requires it.'],
      ['Sick leave', 'If you are ill, tell your manager before the start of your working day. For absences longer than three consecutive days you need a medical certificate. Sick days do not reduce your paid time off.'],
      ['Public holidays', 'You get the public holidays of the country where your employment contract is registered. If a public holiday falls on a weekend, the local rules decide whether it moves to a weekday.'],
    ],
  },
  {
    id: 'parental',
    title: 'Parental Leave Policy',
    collectionId: 'hr',
    fileName: 'parental-leave-policy.pdf',
    sizeKb: 420,
    updatedAt: '2026-03-02',
    owner: 'People Team',
    sections: [
      ['Who is eligible', 'All employees with at least six months of service are eligible for enhanced parental leave, regardless of gender, or whether they become parents through birth, adoption or surrogacy.'],
      ['Primary caregiver leave', 'The primary caregiver gets 20 weeks of fully paid parental leave. Leave can start up to four weeks before the expected due date or placement date and must be taken within 12 months of the birth or placement.'],
      ['Secondary caregiver leave', 'The secondary caregiver gets 8 weeks of fully paid parental leave, which can be taken in up to three separate blocks within the first 12 months.'],
      ['Spain', 'In Spain, the statutory birth and childcare leave is 16 weeks per parent, paid by Social Security. Brightwell tops up the statutory benefit to 100% of your salary and adds the remaining weeks so that the total matches the primary or secondary caregiver entitlement.'],
      ['How to request leave', 'Tell your manager and the People Team at least 15 days before your leave starts and submit the request in the HR portal. Attach the expected date of birth or placement documents.'],
      ['Returning to work', 'After parental leave you can use a phased return: during the first four weeks you work 80% of your hours on full pay. Talk to your manager about flexible arrangements after that.'],
    ],
  },
  {
    id: 'remote',
    title: 'Remote & Hybrid Work Policy',
    collectionId: 'hr',
    fileName: 'remote-hybrid-work.pdf',
    sizeKb: 310,
    updatedAt: '2025-11-20',
    owner: 'People Team',
    sections: [
      ['Hybrid schedule', 'Office-based teams work from the office three days a week; the team agrees which days. Fully remote roles are listed as remote in the employment contract.'],
      ['Working from abroad', 'You can work from another country for up to 30 days per calendar year. You need approval from your manager and the People Team at least two weeks in advance, so we can check tax and immigration rules.'],
      ['Home office stipend', 'Remote and hybrid employees get a one-time home office stipend of 500 EUR for furniture and equipment, plus 40 EUR per month for internet and utilities, paid with your salary.'],
    ],
  },
  {
    id: 'learning',
    title: 'Learning & Development Guidelines',
    collectionId: 'hr',
    fileName: 'learning-development.pdf',
    sizeKb: 210,
    updatedAt: '2026-02-10',
    owner: 'People Team',
    sections: [
      ['Annual learning budget', 'Every employee has a personal learning budget of 1,200 EUR per year for courses, books, certifications and conferences. Unused budget does not carry over.'],
      ['Conferences', 'Attending a conference counts against your learning budget for the ticket; travel follows the Travel & Expense Policy. You get up to three learning days per year that do not count as time off.'],
      ['Certifications', 'Certification exams are covered once per certification. If you fail, the retake is covered when your manager approves it.'],
    ],
  },
  {
    id: 'travel',
    title: 'Travel & Expense Policy',
    collectionId: 'finance',
    fileName: 'travel-expense-policy.pdf',
    sizeKb: 560,
    updatedAt: '2026-04-01',
    owner: 'Finance',
    sections: [
      ['Flights', 'Book economy class for flights under six hours. For flights over six hours you may book business class with approval from your VP. Book through the company travel tool at least 14 days ahead when possible.'],
      ['Hotels', 'Hotel rates are capped per night: 180 EUR in Madrid and Barcelona, 220 EUR in London and Paris, 250 USD in New York, and 140 EUR elsewhere. Stays above the cap need approval from your manager before booking.'],
      ['Meals and per diem', 'While travelling you can expense meals up to a per diem of 60 EUR per day. Alcohol is not reimbursed, except at client dinners approved by your manager.'],
      ['Submitting expenses', 'Submit expenses with itemised receipts in the expense tool within 30 days of the purchase. Expenses older than 90 days are not reimbursed. Reimbursements are paid with the next payroll.'],
      ['Mileage', 'Using your own car for business travel is reimbursed at 0.26 EUR per kilometre, plus parking and tolls with receipts.'],
    ],
  },
  {
    id: 'security',
    title: 'Information Security Policy',
    collectionId: 'it',
    fileName: 'information-security-policy.pdf',
    sizeKb: 760,
    updatedAt: '2026-05-12',
    owner: 'Security Team',
    sections: [
      ['Passwords and MFA', 'Passwords must be at least 14 characters and unique for every system. Use the company password manager. Multi-factor authentication is required for email, the VPN and every system that holds customer data.'],
      ['Devices', 'Company laptops must have full-disk encryption, automatic updates and the endpoint protection agent enabled. Lock your screen when you step away. Personal devices may access email only through the managed mobile app.'],
      ['Reporting incidents', 'Report any suspected security incident, such as a lost laptop, a phishing email you clicked, or data sent to the wrong person, to security@brightwell.example within one hour. Use the Report Phishing button in your email client for suspicious emails.'],
      ['Lost or stolen devices', 'If your laptop or phone is lost or stolen, report it to the Security Team immediately so the device can be wiped remotely, then file a police report within 48 hours.'],
    ],
  },
  {
    id: 'ai-tools',
    title: 'Acceptable Use of AI Tools',
    collectionId: 'it',
    fileName: 'acceptable-use-ai-tools.pdf',
    sizeKb: 190,
    updatedAt: '2026-06-30',
    owner: 'Security Team',
    sections: [
      ['Approved tools', 'Only use AI tools on the approved list in the IT portal for company work. Approved tools have a data processing agreement and do not train on our data.'],
      ['Data you may not share', 'Never paste customer personal data, credentials, source code from client projects, or confidential financial information into AI tools that are not on the approved list.'],
      ['Human review', 'AI-generated content that goes to customers or is published externally must be reviewed by a person, who is accountable for its accuracy.'],
    ],
  },
  {
    id: 'conduct',
    title: 'Code of Conduct',
    collectionId: 'legal',
    fileName: 'code-of-conduct.pdf',
    sizeKb: 640,
    updatedAt: '2025-09-01',
    owner: 'Legal',
    sections: [
      ['Gifts and hospitality', 'You may accept gifts or hospitality worth up to 75 EUR per person per year from the same business partner. Anything above that must be declined or reported to Legal. Never accept cash or gift cards.'],
      ['Conflicts of interest', 'Disclose any potential conflict of interest, such as a side business, a family member at a supplier, or an investment in a competitor, to your manager and Legal before it affects a decision.'],
      ['Speaking up', 'You can raise concerns about misconduct with your manager, the People Team, Legal, or anonymously through the Speak Up hotline. Retaliation against anyone who raises a concern in good faith is not tolerated.'],
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention Policy',
    collectionId: 'legal',
    fileName: 'data-retention-policy.pdf',
    sizeKb: 350,
    updatedAt: '2026-01-28',
    owner: 'Legal',
    sections: [
      ['Customer data', 'Customer data is kept for the duration of the contract and deleted six years after the contract ends, unless a longer period is required by law.'],
      ['Employee records', 'Employee records are kept for five years after employment ends. Payroll and tax records are kept for as long as local tax law requires.'],
      ['Deletion requests', 'Requests from individuals to delete their personal data must be completed within 30 days. Forward any request you receive to privacy@brightwell.example on the same day.'],
    ],
  },
];

export function seedDocuments(): PolicyDocument[] {
  return SEEDS.map(({ sections, ...seed }) => ({
    ...seed,
    status: 'ready',
    progress: 100,
    chunks: sections.map(([heading, text], i) => ({ id: `${seed.id}-${i + 1}`, documentId: seed.id, heading, text })),
  }));
}

/** Hand-written answers for the suggested questions, so the demo's first impression is polished. */
export interface CuratedAnswer {
  question: string;
  answer: string; // [n] refers to chunkIds[n - 1]
  chunkIds: string[];
  followUps: string[];
}

export const CURATED: CuratedAnswer[] = [
  {
    question: 'How much parental leave do I get in Spain?',
    answer:
      'In Spain you get the statutory 16 weeks of birth and childcare leave, paid by Social Security, and Brightwell tops that up to 100% of your salary [1]. ' +
      'Brightwell then adds weeks so your total matches the company entitlement:\n\n' +
      '- **Primary caregiver:** 20 weeks fully paid [2]\n' +
      '- **Secondary caregiver:** 8 weeks fully paid, in up to three blocks [3]\n\n' +
      'Tell your manager and the People Team at least 15 days before your leave starts [4].',
    chunkIds: ['parental-4', 'parental-2', 'parental-3', 'parental-5'],
    followUps: ['Can I return to work part-time after parental leave?', 'Who is eligible for parental leave?'],
  },
  {
    question: 'Can I carry over unused vacation days?',
    answer:
      'Yes, up to **5 unused days** carry over into the next year, but you must use them by **31 March** or they expire [1]. ' +
      'Days above that limit are not paid out unless local law requires it [1].\n\n' +
      'For reference, full-time employees get 25 days of paid time off per year plus public holidays [2].',
    chunkIds: ['handbook-3', 'handbook-2'],
    followUps: ['How do I request time off?', 'Do sick days reduce my paid time off?'],
  },
  {
    question: 'What is the hotel limit for a business trip to London?',
    answer:
      'The hotel cap in London is **220 EUR per night** [1]. If you need to book above the cap, get your manager\'s approval before booking [1].\n\n' +
      'While travelling, meals are covered up to a per diem of 60 EUR per day [2], and expenses need itemised receipts within 30 days [3].',
    chunkIds: ['travel-2', 'travel-3', 'travel-4'],
    followUps: ['Can I fly business class?', 'How do I submit expenses?'],
  },
  {
    question: 'I clicked a phishing link, what should I do?',
    answer:
      'Report it to **security@brightwell.example within one hour**; a clicked phishing email counts as a security incident [1]. ' +
      'For suspicious emails you haven\'t clicked, use the Report Phishing button in your email client [1].\n\n' +
      'If you entered your password, change it in the password manager; every system needs a unique password of at least 14 characters [2].',
    chunkIds: ['security-3', 'security-1'],
    followUps: ['What if my laptop is stolen?', 'Which AI tools am I allowed to use?'],
  },
  {
    question: 'Can I work from another country for a few weeks?',
    answer:
      'Yes, for up to **30 days per calendar year** [1]. You need approval from your manager and the People Team at least two weeks in advance, so they can check tax and immigration rules [1].\n\n' +
      'Note that office-based teams otherwise work from the office three days a week [2].',
    chunkIds: ['remote-2', 'remote-1'],
    followUps: ['Is there a home office stipend?', 'What are the core working hours?'],
  },
  {
    question: 'Can I paste customer data into ChatGPT?',
    answer:
      'No. Customer personal data, credentials, client source code and confidential financial information must never go into AI tools that are not on the approved list [1]. ' +
      'Check the approved list in the IT portal; approved tools have a data processing agreement and do not train on our data [2].\n\n' +
      'Anything AI-generated that goes to customers must be reviewed by a person [3].',
    chunkIds: ['ai-tools-2', 'ai-tools-1', 'ai-tools-3'],
    followUps: ['How do I report a security incident?', 'Can I accept a gift from a supplier?'],
  },
];

export const SUGGESTED_QUESTIONS = CURATED.map((c) => c.question);
