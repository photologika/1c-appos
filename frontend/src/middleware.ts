import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ru', 'zh', 'ja', 'ko'],
  defaultLocale: 'en'
});

export const config = {
  matcher: ['/', '/(en|ru|zh|ja|ko)/:path*']
};
