# Relax QC Control Center V2

Professional prototype based on the supplied Contractor Quality Checklist & Confirmation.

## V2 features
- Responsive modern dashboard
- 20 source checklist stages
- Mandatory QC hold/witness stages highlighted
- Job records stored in SQLite
- Interactive checklist persistence
- Saved job history
- Evidence/photo/PDF upload endpoint
- Digital signature canvas for contractor and QC
- Final confirmation status
- Printable inspection report
- Role/login screen placeholder
- API architecture for future mobile app and integrations

## Run
Requires Node.js 20+.

```bash
npm install
npm start
```

Open http://localhost:3000

### Important
The login screen is a prototype UI, not production authentication. For real deployment, add company SSO/JWT/password security, HTTPS, access control, backups, and secure file storage.
