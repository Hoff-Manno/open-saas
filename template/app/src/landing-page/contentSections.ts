import daBoiAvatar from '../client/static/da-boi.webp';
import kivo from '../client/static/examples/kivo.webp';
import messync from '../client/static/examples/messync.webp';
import microinfluencerClub from '../client/static/examples/microinfluencers.webp';
import promptpanda from '../client/static/examples/promptpanda.webp';
import reviewradar from '../client/static/examples/reviewradar.webp';
import scribeist from '../client/static/examples/scribeist.webp';
import searchcraft from '../client/static/examples/searchcraft.webp';
import { BlogUrl, DocsUrl } from '../shared/common';
import type { GridFeature } from './components/FeaturesGrid';

export const features: GridFeature[] = [
  {
    name: 'AI-Powered PDF Processing',
    description: 'Convert PDFs to interactive learning modules with Mozilla AI Docling',
    emoji: '🤖',
    href: DocsUrl,
    size: 'large',
  },
  {
    name: 'Smart Content Segmentation',
    description: 'Automatically break down content into digestible learning sections',
    emoji: '📚',
    href: DocsUrl,
    size: 'medium',
  },
  {
    name: 'Progress Tracking',
    description: 'Monitor learning progress with detailed analytics and insights',
    emoji: '📈',
    href: DocsUrl,
    size: 'medium',
  },
  {
    name: 'Team Management',
    description: 'Assign modules, track team progress, and manage learning workflows',
    emoji: '👥',
    href: DocsUrl,
    size: 'large',
  },
  {
    name: 'OCR & Vision AI',
    description: 'Extract text from scanned documents and generate image descriptions',
    emoji: '👁️',
    href: DocsUrl,
    size: 'small',
  },
  {
    name: 'Question Generation',
    description: 'Auto-generate comprehension questions from your content',
    emoji: '❓',
    href: DocsUrl,
    size: 'small',
  },
  {
    name: 'Google Workspace SSO',
    description: 'Seamless team access with existing Google credentials',
    emoji: '🔐',
    href: DocsUrl,
    size: 'small',
  },
  {
    name: 'Flexible Subscriptions',
    description: 'Scale with your team size and usage needs',
    emoji: '💳',
    href: DocsUrl,
    size: 'small',
  },
  {
    name: 'Mobile Responsive',
    description: 'Learn anywhere with our mobile-optimized interface',
    emoji: '📱',
    href: DocsUrl,
    size: 'medium',
  },
];

export const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Learning & Development Manager',
    avatarSrc: daBoiAvatar,
    socialUrl: '#',
    quote: "We transformed our entire onboarding process in weeks, not months. Our new hires are completing training 40% faster with better comprehension.",
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Training Director @ TechCorp',
    avatarSrc: daBoiAvatar,
    socialUrl: '',
    quote: 'The AI-powered question generation saves us hours of manual work. Our compliance training is now engaging and trackable.',
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Corporate Education Specialist',
    avatarSrc: daBoiAvatar,
    socialUrl: '#',
    quote: 'Finally, a solution that makes our technical documentation accessible to everyone. The progress analytics help us identify knowledge gaps instantly.',
  },
];

export const faqs = [
  {
    id: 1,
    question: 'How does the PDF processing work?',
    answer: 'We use Mozilla AI\'s Docling technology to convert your PDFs into structured, interactive learning modules. The AI preserves formatting, extracts images, and handles complex layouts including tables and formulas.',
    href: '#',
  },
  {
    id: 2,
    question: 'What file types are supported?',
    answer: 'Currently we support PDF files, including scanned documents. Our OCR technology can extract text from image-based PDFs and generate accessible content.',
    href: '#',
  },
  {
    id: 3,
    question: 'How does team management work?',
    answer: 'Admins can invite team members, assign learning modules, and track progress through our comprehensive dashboard. We support Google Workspace SSO for seamless access.',
    href: '#',
  },
  {
    id: 4,
    question: 'What are the subscription limits?',
    answer: 'Starter plan includes 10 modules and 25 team members. Professional offers unlimited modules and up to 100 team members. Enterprise provides unlimited everything plus API access.',
    href: '#',
  },
  {
    id: 5,
    question: 'Is my data secure?',
    answer: 'Yes, all PDFs and processed content are encrypted at rest in AWS S3. We maintain strict data isolation between organizations and comply with GDPR requirements.',
    href: '#',
  },
];

export const footerNavigation = {
  app: [
    { name: 'Documentation', href: DocsUrl },
    { name: 'Blog', href: BlogUrl },
  ],
  company: [
    { name: 'About', href: 'https://wasp.sh' },
    { name: 'Privacy', href: '#' },
    { name: 'Terms of Service', href: '#' },
  ],
};

export const examples = [
  {
    name: 'Employee Onboarding',
    description: 'Transform HR handbooks and policy documents into interactive onboarding modules with progress tracking.',
    imageSrc: kivo,
    href: '#',
  },
  {
    name: 'Compliance Training',
    description: 'Convert regulatory documents into engaging training modules with auto-generated comprehension questions.',
    imageSrc: messync,
    href: '#',
  },
  {
    name: 'Technical Documentation',
    description: 'Make complex technical manuals accessible with AI-enhanced explanations and visual descriptions.',
    imageSrc: microinfluencerClub,
    href: '#',
  },
  {
    name: 'Sales Enablement',
    description: 'Turn product documentation into interactive sales training with team progress analytics.',
    imageSrc: promptpanda,
    href: '#',
  },
  {
    name: 'Professional Development',
    description: 'Create learning paths from industry reports and research papers with intelligent content segmentation.',
    imageSrc: reviewradar,
    href: '#',
  },
  {
    name: 'Safety Training',
    description: 'Convert safety manuals into trackable training modules with visual content descriptions.',
    imageSrc: scribeist,
    href: '#',
  },
  {
    name: 'Product Training',
    description: 'Transform user manuals and specifications into comprehensive learning experiences.',
    imageSrc: searchcraft,
    href: '#',
  },
];
