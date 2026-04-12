export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/candidate/', '/assessment/', '/checkout/'],
      },
    ],
    sitemap: 'https://proofwork-nine.vercel.app/sitemap.xml',
  }
}
