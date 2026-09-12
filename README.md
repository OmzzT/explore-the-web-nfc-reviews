# Explore the Web — NFC Reviews

NFC review and private feedback system for Explore the Web.

## Architecture

- **GitHub** — source code and version history
- **Cloudflare** — website hosting and deployment
- **Supabase** — businesses, NFC cards, feedback and scan events

The customer-facing site uses one shared application. Each NFC card supplies its own card code, which is resolved against Supabase to load the correct business.
