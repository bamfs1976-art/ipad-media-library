# Media Library

A personal web app for organising media file lists from public web folders. Built for Safari on iPad.

Paste a web folder link. The app reads every file name inside, tidies the names and groups them into films and TV shows. You add tags and collections, then search and filter. The app organises file lists only. It does not play or download videos.

All library data stays in your browser's storage on your iPad. The only thing sent to the server is the folder address to read.

## Use it on your iPad

1. Open the site in Safari.
2. Tap Share, then Add to Home Screen.
3. Open Library from your Home Screen.

Do not use Private Browsing. Safari turns off storage there, so your library will not save.

## Run it locally

```
npm install
npm run dev     # http://localhost:3000
npm test        # name cleaning, grouping, listing parser and safety checks
npm run build
```

To test against a folder server on your own computer, start the app with `ALLOW_PRIVATE_NETWORK=true`. Never set this on the hosted site.

## Deploy

Live at https://ipad-media-library.netlify.app (Netlify project `ipad-media-library`, team `bamfs1976`).

Netlify builds the site from `netlify.toml`. No environment variables are needed. The project is not linked to GitHub yet, so pushes do not redeploy on their own. To turn that on, open the project in Netlify, go to Project configuration, Build and deploy, and link this repository.

## Good to know

- The app reads plain folder listings (pages titled "Index of"). Designed web pages hold no file links to read.
- Some servers limit how fast you read them. The scan pauses between folders and retries when asked to slow down, but a few folders still fail on busy servers. Press Rescan later.

## Credits

File name cleaning is ported from [argus](https://github.com/neon16bit/argus) by neon16bit, Apache License 2.0. See NOTICE.
