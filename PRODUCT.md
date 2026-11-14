# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: funeral and cemetery staff.** They create and manage memorials on behalf of the families they serve. In the product they're called "admins", and each account needs the superadmin's approval.
- **Visitors: mourners, relatives, and friends.** They reach a published memorial by QR code or link, often at the place of rest and usually on a phone. They view the memorial, light a candle, or leave a message without an account.
- **Superadmin: the MournHub operator.** They approve or revoke admin accounts and create password reset links.

The first audience is international, and the product is written in English.

## Product Purpose

MournHub gives a person who has died a lasting online memorial that visitors can reach from a QR code. A memorial holds their photo, dates, life story, and photo gallery, along with candles and messages from visitors.

## Positioning

The memorial is connected to a physical place: a QR code placed at the place of rest opens that person's page, with no app or visitor account. Staff decide when each memorial goes public.

## Operating Context

- Staff write a memorial, keep it private as a draft, publish it, then download its QR code for printing and placement at the place of rest.
- Visitors may be outdoors, on a phone, and grieving when they scan the code.
- A printed code can't be changed once placed, so memorial links have to stay stable.

## Capabilities and Constraints

- **Memorials:** create, edit, publish, unpublish, and delete. Each has an optional main photo, a gallery with captions, birth and death dates, and a life story.
- **Visitors:** view the memorial and gallery, light a candle, and leave a guestbook message. Messages appear immediately, are rate limited, and can be removed by the memorial's owner.
- **Privacy:** memorials stay private until published, and published memorial pages are excluded from search results.
- **Accounts:** admin registration needs approval. There's no email integration, so password resets use links created by the superadmin.
- **Stack:** Express and EJS with server-rendered pages, shared styles in `public/css/style.css`, and a Content Security Policy that blocks inline scripts.
- **Undecided:** how an organization gets access, including pricing, plans, and partner terms. Don't state or imply any of these until they're decided.

## Brand Commitments

- The product name is MournHub.

## Evidence on Hand

- `views/landing.ejs` has a sample memorial using the invented name "Maria Santos", labeled on the page as not a real person.
- The project has no customers, partners, testimonials, statistics, press, or pricing. Don't invent any of these.

## Product Principles

1. **The family's loss comes first.** MournHub serves grieving people, including when the immediate reader is a staff member working on a family's behalf.
2. **A printed code is a promise.** A code placed at a grave has to keep working, so links and access can't be treated as disposable.
3. **Publishing is a human decision.** Nothing goes public until a person chooses to publish it.
4. **Visitors arrive with nothing to set up.** Reaching a memorial, lighting a candle, or leaving a message never requires an account or an app.
5. **Claim only what's true.** Trust matters more than persuasion, so never overstate permanence, adoption, or results.
