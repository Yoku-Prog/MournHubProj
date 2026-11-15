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
4. Create the superadmin on the server, then open the one-time link it prints to choose a password. The register page never creates a superadmin in production, and `SUPERADMIN_EMAIL` is ignored there.

   ```sh
   npm run create-superadmin -- you@example.com "Your Name"
   ```

### Vercel

Vercel runs the app with no extra configuration (either `app.js` or `server.js` works as its entry point), and serves `public/` itself. Set the same environment variables in the project's settings, and allow access from anywhere (`0.0.0.0/0`) in MongoDB Atlas, because Vercel has no fixed address. Vercel refuses requests over 4.5 MB, so the memorial form shrinks photos in the browser before sending them.

Rate limits are kept in memory, so they reset on restart and aren't shared if you run more than one instance.

## Time online

Publishing a memorial for the first time asks how long it stays online: 1 year, 5 years or permanent. The time starts that day, and unpublishing for a while doesn't pause it.

- When the time ends, visitors who scan the code see a page saying the memorial's time online has ended. Nothing is deleted.
- The dashboard shows each end date, and marks memorials with 30 days or less left.
- **Extend** adds time after what's left; **Bring back online** restarts an ended memorial from today.
- Each term chosen is recorded on the memorial (`termPurchases`) for billing.
- Memorials published before this existed have no end date and are treated as permanent.

## Admin accounts

- New registrations wait for approval under **Manage admins**.
- There's no email integration, so the superadmin creates password reset links on that page and sends them to the admin directly. Links work once and expire after 24 hours.
- Revoking an admin logs them out and keeps their published memorials online.
- If the superadmin is locked out, run this on a machine with the production environment variables:

  ```sh
  npm run reset-link -- you@example.com
  ```
