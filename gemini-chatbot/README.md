# ✦ EmbedAI — Plug-and-Play AI Chat Widget [ASK AI] for Any Business Website — Full Stack SaaS Platform

Power your website with a smart AI assistant trained on your own content. Upload your documents, grab your embed code, and go live 
in minutes — powered by Google Gemini AI.

## 🌟 Key Features

### For Users
- 💬 ChatGPT-style chat interface with conversation history
- 🤖 AI responses based on uploaded knowledge base documents
- 📱 Responsive design for all devices
- 🔗 Widget embed for any website. [[ASK AI]] Small Widget Button On Client's Websites To Handle client's Users.

### For Clients
- 👤 Client signup with email verification (OTP)
- 🔐 Secure client dashboard
- 📄 Upload and manage knowledge base documents (PDF, TXT, CSV, MD)
- 📊 View chat statistics and analytics
- 🔄 Change email with OTP verification
- 🔑 Forgot password with OTP reset
- � Email notifications for verification
- ⚙️ [ASK AI] Widget API Key Client Will Get On Top of embed code dashboard.

### For Admins
- 🛡️ Secure Admin Panel with JWT authentication
- 👥 Client management (approve, reject, toggle, delete)
- 📊 Dashboard analytics (total clients, documents, chat sessions)
- 📄 Global knowledge base management
- ⚙️ System settings (API keys, chatbot name, welcome message)
- 🔄 Change email with OTP verification
- 🔑 Forgot password with OTP reset
- 📧 Email notifications via Resend

### Security & Authentication
- 🔒 JWT-based authentication for admin and clients
- � Email verification with OTP (6-digit codes)
- 🔐 Password strength validation
- 🛡️ Protected routes with middleware
- 📋 Client approval workflow
- 🔄 OTP-based password reset (no reset links)
- ⏱️ OTP expiration (10 minutes)
- 🚫 Rate limiting on OTP resend (30 seconds cooldown)

---

## 🚀 Quick Start (Step-by-Step)

### Step 1 — Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) v18 or higher
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account
- A free [Gemini API key](https://aistudio.google.com/app/apikey)
- A free [Resend API key](https://resend.com) for email notifications

---

### Step 2 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Click **"Build a Database"** → Choose **M0 Free Tier**
3. Set a **username** and **password** (save these!)
4. Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Go to **Clusters** → Click **Connect** → **Drivers** → **Node.js**
6. Copy your connection string, it looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```

---

### Step 3 — Configure Environment

Edit `backend/.env`:

```env
# Paste your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster0.xxxxx.mongodb.net/gemini-chatbot?retryWrites=true&w=majority

# Change these to long random secret strings
JWT_SECRET=change_this_to_a_random_secret_string_min_32_chars
CLIENT_JWT_SECRET=change_this_to_another_random_secret_string_min_32_chars

# Your Gemini API key (optional here, can also set from Admin Panel UI)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash-lite

# Resend API key for email notifications (get from resend.com)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Admin login credentials (change after first login!)
ADMIN_EMAIL=admin@chatbot.com
ADMIN_PASSWORD=Admin@123456

# Server port
PORT=5000
```

---

### Step 4 — Install Dependencies

Open terminal in the project root folder and run:

```bash
# Install root dependencies (concurrently)
npm install

# Install backend + frontend dependencies
npm run install:all
```

---

### Step 5 — Start the App

```bash
# Start both backend and frontend together
npm run dev
```

Or start separately:
```bash
# Terminal 1 — Backend (runs on port 5000)
npm run start:backend

# Terminal 2 — Frontend (runs on port 3000)
npm run start:frontend
```

---

### Step 6 — First Login

1. Open [http://localhost:3000](http://localhost:3000) → Chat interface
2. Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
3. Login with credentials from your `.env` file (default: `admin@chatbot.com` / `Admin@123456`)

---

### Step 7 — Set Up Gemini API Key

1. Get your free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. In Admin Panel → **Settings** → paste your key → **Save Settings**

---

### Step 8 — Upload Knowledge Base

In Admin Panel → **Knowledge Base** tab:
- **Upload File**: drag & drop PDF, TXT, CSV, or MD files
- **Paste Text**: paste FAQs, policies, or any info directly

The AI will now answer based on your uploaded documents!

---

## 📁 Project Structure

```
gemini-chatbot/
├── backend/
│   ├── models/          # MongoDB schemas
│   │   ├── Admin.js              # Admin user model
│   │   ├── Client.js             # Client user model
│   │   ├── Document.js           # Document/knowledge base model
│   │   ├── ChatSession.js        # Chat session model
│   │   ├── Settings.js           # System settings model
│   │   └── OTP.js                # OTP model with TTL index
│   ├── routes/          # Express routes
│   │   ├── auth.js               # Admin auth (login, forgot password, change email)
│   │   ├── clients.js            # Client auth, docs, settings
│   │   ├── chat.js               # Chat API
│   │   ├── docs.js               # Document management
│   │   └── settings.js           # System settings
│   ├── middleware/      # Authentication middleware
│   │   ├── adminAuth.js          # Admin JWT verification
│   │   └── clientAuth.js         # Client JWT verification
│   ├── utils/
│   │   ├── geminiService.js      # Core Gemini AI logic
│   │   ├── emailService.js       # Resend email integration
│   │   ├── documentExtract.js    # PDF/text extraction
│   │   ├── ids.js                # ID generators
│   │   ├── sanitize.js           # Input sanitization
│   │   ├── planLimits.js         # Plan limits validation
│   │   └── clientApproval.js     # Client approval logic
│   ├── uploads/         # Temp file storage (auto-cleaned after extraction)
│   ├── server.js        # Express app entry point
│   └── .env             # ← EDIT THIS FILE
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx              # User chat interface
│   │   │   ├── WidgetChat.jsx            # Embed widget chat
│   │   │   ├── AdminLogin.jsx            # Admin login screen
│   │   │   ├── AdminForgotPassword.jsx   # Admin forgot password (OTP)
│   │   │   ├── AdminDashboard.jsx        # Admin panel
│   │   │   ├── ClientSignup.jsx          # Client signup with OTP
│   │   │   ├── ClientLogin.jsx           # Client login
│   │   │   ├── ClientForgotPassword.jsx  # Client forgot password (OTP)
│   │   │   └── ClientDashboard.jsx       # Client dashboard
│   │   ├── components/
│   │   │   ├── OTPInput.jsx              # OTP input component
│   │   │   └── PasswordStrength.jsx      # Password strength meter
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # Admin auth state
│   │   │   └── ClientAuthContext.jsx     # Client auth state
│   │   ├── utils/
│   │   │   ├── api.js                    # Admin API calls
│   │   │   └── clientApi.js              # Client API calls
│   │   └── index.css                     # Global dark theme styles
│   └── .env             # ← Set REACT_APP_API_URL if deploying
│
└── package.json         # Root scripts (npm run dev)
```

---

## 🌐 API Endpoints

### Admin Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Admin login |
| GET | `/api/auth/me` | Admin | Verify token |
| POST | `/api/auth/forgot-password` | — | Send OTP for password reset |
| POST | `/api/auth/reset-password` | — | Reset password with OTP |
| PUT | `/api/auth/change-password` | Admin | Change password |
| PUT | `/api/auth/change-email` | Admin | Request email change (send OTP) |
| POST | `/api/auth/verify-change-email` | Admin | Verify email change with OTP |

### Client Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/clients/signup` | — | Client signup (sends OTP) |
| POST | `/api/clients/login` | — | Client login |
| POST | `/api/clients/verify-email` | — | Verify email with OTP |
| POST | `/api/clients/resend-otp` | — | Resend OTP |
| POST | `/api/clients/forgot-password` | — | Send OTP for password reset |
| POST | `/api/clients/reset-password` | — | Reset password with OTP |
| GET | `/api/clients/me` | Client | Get client profile |
| PUT | `/api/clients/profile` | Client | Update client profile |
| PUT | `/api/clients/change-password` | Client | Change password |
| PUT | `/api/clients/change-email` | Client | Request email change (send OTP) |
| POST | `/api/clients/verify-change-email` | Client | Verify email change with OTP |
| DELETE | `/api/clients/account` | Client | Delete account |

### Chat API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/message` | — | Send a message |
| GET | `/api/chat/sessions` | — | List chat sessions |
| GET | `/api/chat/sessions/:id` | — | Get session messages |
| DELETE | `/api/chat/sessions/:id` | — | Delete session |

### Document Management (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/docs` | Admin | List documents |
| POST | `/api/docs/upload` | Admin | Upload a file |
| POST | `/api/docs/text` | Admin | Add pasted text |
| DELETE | `/api/docs/:id` | Admin | Delete document |
| PATCH | `/api/docs/:id/toggle` | Admin | Enable/disable document |

### Document Management (Client)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/clients/docs` | Client | List client documents |
| POST | `/api/clients/docs/upload` | Client | Upload a file |
| POST | `/api/clients/docs/text` | Client | Add pasted text |
| DELETE | `/api/clients/docs/:id` | Client | Delete document |
| PATCH | `/api/clients/docs/:id/toggle` | Client | Enable/disable document |

### Admin Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/clients` | Admin | List all clients |
| GET | `/api/admin/clients/pending` | Admin | List pending clients |
| PUT | `/api/admin/clients/:id/approve` | Admin | Approve client |
| PUT | `/api/admin/clients/:id/reject` | Admin | Reject client |
| PUT | `/api/admin/clients/:id/toggle` | Admin | Toggle client active status |
| DELETE | `/api/admin/clients/:id` | Admin | Delete client |
| GET | `/api/admin/clients/:id/docs` | Admin | Get client documents |

### Settings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Admin | Get settings |
| PUT | `/api/settings` | Admin | Save settings |
| GET | `/api/settings/public` | — | Get public settings |

### Widget API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/widget/:apiKey/config` | — | Get widget config by API key |
| GET | `/api/widget/client/:clientId/config` | — | Get widget config by client ID |
| POST | `/api/widget/:apiKey/chat` | — | Send widget chat message |

---

## 🔧 Customization

### Change the AI behavior
Edit `backend/utils/geminiService.js` → `buildSystemPrompt()` function.

### Change the AI model
In `geminiService.js`, change `"gemini-2.5-flash-lite"` to any available Gemini model.

### Configure email service
The project uses Resend for email notifications. Configure your Resend API key in `backend/.env`:
```env
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Customize OTP expiration
Edit the OTP expiration time in `backend/routes/clients.js` and `backend/routes/auth.js`:
```javascript
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
```

### Customize password requirements
Edit password validation in the frontend components (`ClientSignup.jsx`, `ClientForgotPassword.jsx`, etc.) and backend routes.

---

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express.js** - Server framework
- **MongoDB** & **Mongoose** - Database & ODM
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **PDF-parse** - PDF text extraction
- **Resend** - Email notifications
- **Google Gemini API** - AI integration

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS Modules** - Component styling

### DevOps
- **Concurrently** - Run multiple processes
- **MongoDB Atlas** - Cloud database hosting

---

## 🚀 Deployment

### Backend (Railway / Render / Fly.io)
1. Push `backend/` to GitHub
2. Set environment variables in the hosting dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_JWT_SECRET`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `FRONTEND_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `PORT`
3. Set start command: `node server.js`

### Frontend (Vercel / Netlify)
1. Push `frontend/` to GitHub
2. Set `REACT_APP_API_URL` to your deployed backend URL
3. Build command: `npm run build`

### Environment Variables Checklist
Before deploying, make sure all environment variables are set:
- [ ] MongoDB connection string
- [ ] JWT secrets (both admin and client)
- [ ] Gemini API key
- [ ] Resend API key and sender email
- [ ] Frontend URL (for CORS)
- [ ] Admin credentials

---

## 💡 Use Cases

### For Businesses
- **Customer Support Bot**: Upload FAQs, product manuals, support docs to provide instant customer support
- **Sales Assistant**: Upload product catalogs, pricing, and sales scripts to help sales teams
- **Internal Knowledge Base**: Upload company policies, procedures, and documentation for employee queries
- **E-commerce Helper**: Upload product descriptions, shipping info, return policies to assist customers

### For Educational Institutions
- **College Info Bot**: Upload admission brochures, fee structures, course info as PDFs
- **Student Support**: Upload syllabus, assignment guidelines, and academic resources
- **Campus Assistant**: Upload campus maps, event schedules, and facility information

### For Service Providers
- **Restaurant Bot**: Paste menu, hours, delivery info as text
- **Healthcare Assistant**: Upload clinic information, services, and appointment procedures
- **Real Estate Agent**: Upload property listings, neighborhood info, and buying guides

---

## 🔐 Authentication Flow

### Client Signup & Verification
1. User fills signup form (business name, email, password, domain)
2. System creates client account with `isEmailVerified: false` and `approvalStatus: "pending"`
3. System generates 6-digit OTP and sends via email
4. User enters OTP to verify email
5. Client status changes to pending approval
6. Admin approves/rejects client from admin panel
7. Once approved, client can login and access dashboard

### Password Reset Flow (OTP-based)
1. User clicks "Forgot password" on login page
2. User enters email address
3. System generates 6-digit OTP and sends via email
4. User enters OTP and new password on same page
5. System verifies OTP and updates password
6. User can login with new password

### Email Change Flow
1. User enters new email and current password in dashboard settings
2. System generates 6-digit OTP and sends to new email
3. User enters OTP to verify new email
4. System updates email address

---

## 🏗️ Architecture Highlights

### Multi-Tenant SaaS Architecture
- **Admin Panel**: Global management of all clients, documents, and settings
- **Client Dashboard**: Each client has isolated access to their own documents and settings
- **Widget Embed**: Each client gets unique API key for embedding chat widget on their website
- **Client Approval Workflow**: Admin must approve new clients before they can use the platform

### Security Features
- **JWT Authentication**: Separate JWT secrets for admin and client authentication
- **Password Hashing**: Bcrypt for secure password storage
- **OTP-based Verification**: 6-digit codes with 10-minute expiration
- **Rate Limiting**: 30-second cooldown on OTP resend
- **Protected Routes**: Middleware to verify authentication on sensitive endpoints
- **Input Sanitization**: Sanitize user inputs to prevent XSS attacks
- **Domain Validation**: Validate client domains for security

### Database Design
- **TTL Indexes**: Automatic cleanup of expired OTP records
- **Document Isolation**: Each client's documents are isolated by clientId
- **Session Management**: Chat sessions stored with metadata for analytics
- **Settings Management**: Global settings for AI behavior and system configuration

---

## 🎯 Key Development Challenges & Solutions

### Challenge 1: Multi-tenant Document Management
**Problem**: How to ensure each client only accesses their own documents while maintaining a global knowledge base for the admin.

**Solution**: Implemented document isolation using `clientId` field. Admin has access to all documents, while clients can only access documents with their `clientId`. Created separate API endpoints for admin (`/api/docs`) and clients (`/api/clients/docs`).

### Challenge 2: Secure Email Verification
**Problem**: Need to verify user emails without exposing sensitive information or using vulnerable reset links.

**Solution**: Implemented OTP-based verification system using 6-digit codes with 10-minute expiration. Used MongoDB TTL indexes for automatic cleanup of expired OTPs. Integrated Resend API for reliable email delivery.

### Challenge 3: Client Approval Workflow
**Problem**: Need to control who can use the platform while allowing self-service signup.

**Solution**: Implemented three-state approval system: `pending`, `approved`, `rejected`. Clients start as `pending` after signup and email verification. Admin can approve/reject from the dashboard. Only approved clients can login and access the platform.

### Challenge 4: Widget Embed Security
**Problem**: How to allow clients to embed the chat widget on their websites securely.

**Solution**: Generated unique API keys for each client. Widget endpoints validate the API key and only return configuration for the associated client. Used domain validation to ensure widgets only work on approved domains.

### Challenge 5: Password Reset Without Reset Links
**Problem**: Reset links can be insecure if intercepted or forwarded.

**Solution**: Implemented OTP-based password reset flow where users enter OTP directly on the same page. No reset links are sent via email, reducing security risks.

---

## 🚀 Future Improvements

### Planned Features
- [ ] Subscription/Pricing plans integration
- [ ] Payment gateway integration (Stripe)
- [ ] Advanced analytics dashboard for clients
- [ ] Multi-language support
- [ ] Voice input/output for chat
- [ ] File upload in chat (images, documents)
- [ ] Chat history export
- [ ] Webhook integration for custom notifications
- [ ] White-label customization options
- [ ] Mobile apps (React Native)

### Performance Optimizations
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add CDN for static assets
- [ ] Optimize database queries with proper indexing
- [ ] Implement rate limiting on all public endpoints
- [ ] Add request logging and monitoring

### Security Enhancements
- [ ] Implement 2FA (Two-Factor Authentication)
- [ ] Add IP whitelisting for admin access
- [ ] Implement session timeout and refresh tokens
- [ ] Add security headers (CSP, HSTS, etc.)
- [ ] Implement audit logging for sensitive actions

---

## 📊 Project Statistics

- **Total API Endpoints**: 40+
- **Database Models**: 6 (Admin, Client, Document, ChatSession, Settings, OTP)
- **Frontend Pages**: 10+ (Chat, Admin Dashboard, Client Dashboard, Auth pages, etc.)
- **Authentication Methods**: JWT + OTP-based verification
- **Supported File Types**: PDF, TXT, CSV, MD
- **Email Service**: Resend API integration
- **AI Integration**: Google Gemini 2.5 Flash Lite

---

## 🧪 Development Workflow

### Running Tests
```bash
# Backend tests (if added)
cd backend
npm test

# Frontend tests (if added)
cd frontend
npm test
```

### Code Structure Best Practices
- **Backend**: Follow MVC pattern with separate routes, models, and utils
- **Frontend**: Use functional components with hooks, CSS Modules for styling
- **API**: Use axios interceptors for authentication headers
- **Error Handling**: Consistent error responses with proper HTTP status codes

### Adding New Features
1. Create/Update database models in `backend/models/`
2. Add API routes in `backend/routes/`
3. Add middleware if authentication is required
4. Create frontend components in `frontend/src/pages/` or `frontend/src/components/`
5. Add API functions in `frontend/src/utils/api.js` or `clientApi.js`
6. Update routing in `frontend/src/App.jsx`
7. Test thoroughly before committing

---

## 📝 License

Copyright 
This project is made available for EDUCATIONAL PURPOSES ONLY.
You MAY:
  - View and study the code
  - Fork it for personal learning
  - Report bugs and suggest fixes
  - Submit pull requests

You MAY NOT:
  - Use it commercially or to make money
  - Deploy it as a paid product or service
  - Sell or sublicense it in any form

All rights reserved by the original author.

---

## 🤝 Contributing

This is a personal project, If you find any bugs or have suggestions, feel free to open an issue.

---

## 📧 Contact

For questions or feedback about this project, please reach out through the repository issues section.

---

## 🙏 Acknowledgments

- **Google Gemini API** - For providing the AI capabilities
- **Resend** - For email notification services
- **MongoDB Atlas** - For cloud database hosting
- **React** - For the frontend framework
- **Express.js** - For the backend framework

---

**Built with ❤️ using modern web technologies**
