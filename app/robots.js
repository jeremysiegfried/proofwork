export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/login', '/signup'],
    },
    sitemap: 'https://proofwork.vercel.app/sitemap.xml',
  }
}
