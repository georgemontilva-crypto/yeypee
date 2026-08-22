/**
 * The four footer pages, with the copy shown until the admin writes its own.
 * Both the public router and the admin editor read this list, so adding a page
 * here is enough to make it appear in both places.
 */

export interface FooterPage {
  slug: "about" | "contact" | "faq" | "privacy";
  label: string;
  fallbackTitle: string;
  fallbackBody: string;
  /** How many image slots the admin gets for this page. */
  images: number;
}

export const FOOTER_PAGES: FooterPage[] = [
  {
    slug: "about",
    label: "About Us",
    images: 3,
    fallbackTitle: "ABOUT YEYPEE",
    fallbackBody: `YEYPEE is a world of collectible blind box figures, each one with its own
personality, its own friends and its own little story to tell.

Every series is a new world to explore. You never know which character is
waiting inside the box — and somewhere in each collection, a secret rare is
hiding.

## What is a blind box?

A blind box is a sealed box: you know the collection, but not which figure you
are getting. That is the fun of it. Collect them, trade the doubles with
friends, and try to complete the whole series.

## Made to be collected

Every figure is designed to sit proudly on a shelf and to be traded, swapped
and shown off. Whichever one you get, it belongs to a family.`,
  },
  {
    slug: "contact",
    label: "Contact",
    images: 1,
    fallbackTitle: "CONTACT US",
    fallbackBody: `For wholesale, retail partnerships, and distribution inquiries:

info@unifiedtradinggroup.com

Unified Trading Group
Master Distributor – North America

## Stores and distribution

If you own a shop and would like to carry YEYPEE, write to us with your store
name and location and we will get back to you.`,
  },
  {
    slug: "faq",
    label: "FAQ",
    images: 0,
    fallbackTitle: "FREQUENTLY ASKED QUESTIONS",
    fallbackBody: `Q: What is a blind box?
A: A sealed box where the figure inside is a surprise. You know which
collection you are buying, but not which character you will get.

Q: How many figures are in a collection?
A: It depends on the series. Each collection page shows how many characters
there are, plus how many secret rares are hidden in it.

Q: What is a secret rare?
A: A special figure that appears far less often than the rest. Finding one is
the highlight of any collection.

Q: Where can I buy YEYPEE?
A: Check the "Where to find YEYPEE" section on the homepage for our retail
partners, or use the store finder.

Q: Can I choose which character I get?
A: Not in a blind box — that is the whole point. But you can always trade your
doubles with other collectors.`,
  },
  {
    slug: "privacy",
    label: "Privacy",
    images: 0,
    fallbackTitle: "PRIVACY POLICY",
    fallbackBody: `This page explains what we do with the information you share with us.

## What we collect

If you join the YEYPEE Club we store the email address you give us, so we can
send you news about new collections. If you create an account, we also store
your name and the progress of your collection.

## What we do with it

We use it to send you the updates you asked for and to keep your account
working. We do not sell your data to anyone.

## Leaving the club

Every email we send includes a link to unsubscribe, and you can ask us to
delete your account and your data at any time by writing to
info@unifiedtradinggroup.com.

## Cookies

We use the minimum needed to keep you logged in and to remember your
preferences.`,
  },
];
