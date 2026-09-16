import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useProductStore } from '@/store/productStore';

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.94 3.24l-3.47 17.44c-.26 1.16-.95 1.45-1.92.9l-5.31-3.92-2.56 2.47c-.29.29-.52.52-1.07.52l.38-5.37 9.85-8.91c.43-.38-.09-.59-.66-.21L6.68 13.1l-5.22-1.63c-1.14-.35-1.16-1.14.24-1.69l20.43-7.88c.95-.35 1.77.22 1.47 1.69z" />
  </svg>
);

export function StoreFooter() {
  const { storeName, contactPhone, contactEmail, telegramHandle, instagramHandle } = useSettingsStore();
  const hasSaleItems = useProductStore(s => s.products.some(p => p.onSale || (p.compareAtPrice && p.compareAtPrice > p.price) || p.tags?.includes('sale')));

  const cleanTelegram = telegramHandle ? telegramHandle.replace(/^@/, '') : 'ShegAddis';
  const cleanInstagram = instagramHandle ? instagramHandle.replace(/^@/, '') : 'shegaddis_et';

  const shopLinks = [
    ['All Products', '/products'],
    ['New Arrivals', '/products?sortBy=newest'],
  ];
  if (hasSaleItems) {
    shopLinks.push(['Sale', '/products?sale=true']);
  }

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="font-heading text-xl font-bold tracking-tight">
              Sheg<span className="text-primary">Addis</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Specializing in premium sneakers, shoes, and handpicked apparel for Addis Ababa.
            </p>
            {(contactPhone || contactEmail) && (
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                {contactPhone && <p>📞 {contactPhone}</p>}
                {contactEmail && <p>✉️ {contactEmail}</p>}
              </div>
            )}
          </div>
          {[
            { title: 'Shop', links: shopLinks },
            { title: 'Company', links: [['About', '/about']] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Connect</h4>
            <div className="flex items-center gap-4">
              <a
                href={`https://instagram.com/${cleanInstagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title={`@${cleanInstagram}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={`https://t.me/${cleanTelegram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                title={`@${cleanTelegram}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <TelegramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {storeName || 'ShegAddis'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
