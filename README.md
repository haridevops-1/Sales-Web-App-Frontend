# Spikra — AI Proposal & Customer Experience Generator

An enterprise-grade, AI-powered customer proposal and interactive experience generation platform built on React 18, Vite, and Zoho Catalyst Serverless architecture.

Spikra transforms raw technical discovery notes, customer briefs, and requirements into tailored, branded, interactive web proposals and live client experiences in minutes.

---

## Key Features

- **Technical Document Ingestion**: Seamless drag-and-drop upload for discovery notes, RFP briefs, and specification documents in PDF and Word (`.docx`) formats (up to 99 MB) with business logo branding.
- **Automated Text Extraction & Parsing**: Real-time serverless extraction pipeline that extracts technical scope, deliverables, and architecture requirements.
- **AI Scope Analysis & Intelligence**: Deconstructs requirements into executive summaries, milestone phases, and architecture roadmaps.
- **Branded Customer Experience Generation**: Generates customized, interactive web proposals with client branding and technology stacks.
- **Instant Deployment to Slate**: One-click deployment to live serverless hosting (Zoho Catalyst Slate) with shareable production links.
- **Real-Time Pipeline Status Tracker**: Interactive 6-stage stepper monitoring every phase of document processing and generation.
- **Experience Catalog & Search**: Comprehensive repository of all generated proposals with search, filtering, and copyable links.

---

## Tech Stack

- **Framework**: [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Spikra Design System CSS Variables
- **Animations & Effects**: [Framer Motion](https://www.framer.com/motion/), [ReactBits](https://reactbits.dev/), `@radix-ui/react-slot`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend Architecture**: [Zoho Catalyst Serverless](https://catalyst.zoho.com/) (API Gateway, Serverless Functions, Data Store, File Store, Slate Hosting)

---

## Project Structure

```text
Spikra_AI_Proposal/
├── public/                 # Static assets and brand imagery
├── sample-documents/       # Sample discovery docs for local testing
├── src/
│   ├── api/
│   │   └── catalystApi.js  # Centralized Zoho Catalyst serverless API client
│   ├── assets/
│   │   └── brand/          # Spikra brand vectors and icons
│   ├── components/         # Modular UI components
│   │   ├── BrandLogo/      # Animated brand logo
│   │   ├── CustomerExperiencePreview/ # Proposal preview card
│   │   ├── EmptyState/     # Empty state placeholders
│   │   ├── FilePreview/    # Uploaded file preview card
│   │   ├── Footer/         # Enterprise footer
│   │   ├── GeneratedExperiences/ # Created experiences list
│   │   ├── Header/         # Navigation header and user badge
│   │   ├── HeroSection/    # Hero banner
│   │   ├── PipelineStepper/# 6-stage pipeline progress indicator
│   │   ├── ProcessStatus/  # Live processing status card
│   │   ├── ProcessingState/# Animated AI thinking state
│   │   ├── QuickStats/     # Platform metric indicators
│   │   ├── Toast/          # Notification toast system
│   │   ├── UploadDropzone/ # Drag-and-drop document upload
│   │   ├── UploadResultCard/ # Processing result card
│   │   ├── UploadSection/  # Document & logo upload wrapper
│   │   └── ui/             # Reusable UI primitives (buttons, cards, search)
│   ├── pages/
│   │   ├── Dashboard/      # Main proposal generator dashboard
│   │   └── AllExperiences/ # Experience history and catalog page
│   ├── reactbits/          # Interactive animation micro-components
│   ├── styles/             # Global stylesheets and CSS variable tokens
│   ├── utils/
│   │   ├── constants.js    # Application constants, stages, and limits
│   │   └── helpers.js      # Formatting, validation, and sanitization utilities
│   ├── App.jsx             # Top-level application router and state manager
│   ├── index.css           # Global typography and theme definitions
│   └── main.jsx            # React root entry point
├── .env.example            # Environment variable template (safe for VCS)
├── .gitignore              # Git ignore rules for secrets and build artifacts
├── components.json         # Shadcn component configuration
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript / JSX type configuration
└── vite.config.js          # Vite build and dev server proxy configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (version 9 or higher)

### 1. Installation

Clone the repository and install project dependencies:

```bash
git clone https://github.com/<your-username>/spikra-ai-proposal.git
cd spikra-ai-proposal
npm install
```

### 2. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env
```

Open `.env` and verify or configure your Zoho Catalyst API endpoints:

```env
# Zoho Catalyst API Gateway Base URL
VITE_CATALYST_API_BASE_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com

# Function 2: Document Process API URL
VITE_CATALYST_DOCUMENT_PROCESS_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/document/process

# Function 3: AI Analysis API URL
VITE_CATALYST_AI_ANALYSIS_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/document/analyze

# Function 4: Customer Experience Generate API URL
VITE_CATALYST_EXPERIENCE_GENERATE_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/experience/generate

# Function 5: Customer Experience Deploy API URL
VITE_CATALYST_EXPERIENCE_DEPLOY_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/experience/deploy

# Function 6: Spikra Process Status API URL
VITE_CATALYST_PROCESS_STATUS_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/process/status

# Function 7: Spikra Customer Experience List API URL
VITE_CATALYST_EXPERIENCE_LIST_API_URL=https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/experience/list
```

> **Security Notice**: Never commit your `.env` file containing production credentials, secret tokens, or private keys to GitHub. The `.gitignore` file is configured to automatically exclude `.env` and `.env.local` files.

### 3. Running Locally

Start the Vite development server:

```bash
npm run dev
```

The application will be accessible at: `http://localhost:3000`

### 4. Building for Production

Compile and bundle the application for production deployment:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Security Best Practices

1. **Environment Secrets**: All private backend configurations remain in `.env`, which is strictly excluded from version control via `.gitignore`.
2. **CORS & Proxying**: In local development, API requests are proxied via Vite (`/spikra/*`), avoiding CORS headers in client browsers.
3. **Sensitive Data Filtering**: The API client automatically sanitizes sensitive authorization headers, bearer tokens, and credentials before logging errors to the console.
4. **Input Validation**: All uploaded files are validated client-side against strict MIME types and size constraints (99MB document, 5MB logo) prior to transmission.

---

## License

Private & Confidential — Spikra Solutions.
