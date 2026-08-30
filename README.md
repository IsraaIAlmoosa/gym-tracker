# Gym Tracker

تطبيق بسيط لتتبع تمارين الجيم، مبني بـ Next.js (App Router) مع دعم PWA ولغتين (عربي/إنجليزي).

## المزايا

- **PWA**: قابل للتثبيت على الجهاز، مع Service Worker بسيط للعمل بدون اتصال جزئياً (`public/sw.js`).
- **دعم لغتين**: عربي (افتراضي) وإنجليزي عبر [next-intl](https://next-intl.dev), مع تبديل `dir="rtl"`/`"ltr"` تلقائياً حسب اللغة.
- Tailwind CSS 4، TypeScript، Turbopack (افتراضي في Next.js 16).

## البدء

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) — سيتم تحويلك تلقائياً إلى `/ar` أو `/en` حسب لغة المتصفح.

## هيكل المشروع

```
src/
  app/
    manifest.json        # PWA manifest (يُخدَم تلقائياً على /manifest.json)
    [locale]/             # كل الصفحات مضمّنة داخل [locale] (ar | en)
      layout.tsx           # <html lang dir=...> + مزود next-intl
      page.tsx             # الصفحة الرئيسية
      workouts/page.tsx    # صفحة التمارين
  components/
    nav-bar.tsx            # شريط تنقل + مبدّل اللغة
    register-sw.tsx         # تسجيل الـ Service Worker
  i18n/
    routing.ts              # تعريف اللغات المدعومة
    navigation.ts            # Link/useRouter/usePathname الموعّاة باللغة
    request.ts                # تحميل ملفات الترجمة لكل طلب
  proxy.ts                    # (middleware سابقاً) توجيه المسارات حسب اللغة
messages/
  ar.json / en.json           # نصوص الترجمة
public/
  sw.js                       # Service Worker يدوي (cache أساسي)
  icons/                      # أيقونات PWA
```

## ملاحظة تقنية

هذا المشروع يستخدم Next.js 16 (حديث جداً، قد يختلف عن التوثيق المتوفر مسبقاً). عند إجراء تعديلات مستقبلية، راجع `AGENTS.md` والملفات في `node_modules/next/dist/docs/` للاطلاع على أي تغييرات جوهرية (breaking changes) قبل كتابة كود جديد.
