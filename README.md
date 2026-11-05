# MournHub

A platform where you commemorate your loved ones. Approved admins create memorial pages and share them with a QR code. Visitors don't need an account to view a memorial, light a candle, or leave a message.

Built with Node.js, Express 5, EJS, MongoDB (Mongoose), and Cloudinary for photos.

## Local setup

Requires Node.js 22 or newer, a MongoDB database, and a Cloudinary account.

```sh
npm install
cp .env.example .env   # then fill in the values
npm start              # http://localhost:3000
```

## Tests

```sh
npm test
```

Tests use a temporary in-memory MongoDB and a fake Cloudinary, so they never touch real data. The first run downloads a MongoDB binary.

## Deploying

1. Set `NODE_ENV=production` and the variables marked as required in `.env.example`. The app won't start if any are missing.
2. Set `BASE_URL` to the final HTTPS domain **before printing QR codes**, because each code permanently contains that address.
3. Run the app behind an HTTPS proxy, which most hosts provide. Session cookies only work over HTTPS in production. Set `TRUST_PROXY` if there's more than one proxy in front of the app.
4. Set `SUPERADMIN_EMAIL`, then register with that address to create the superadmin account.

Rate limits are kept in memory, so they reset on restart and aren't shared if you run more than one instance.

## Admin accounts

- New registrations wait for approval under **Manage admins**.
- There's no email integration, so the superadmin creates password reset links on that page and sends them to the admin directly. Links work once and expire after 24 hours.
- Revoking an admin logs them out and keeps their published memorials online.
- If the superadmin is locked out, run this on a machine with the production environment variables:

  ```sh
  npm run reset-link -- you@example.com
  ```
