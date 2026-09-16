import { useSettingsStore } from '@/store/settingsStore';
import { MapPin, ShoppingBag, Leaf, MessageSquare } from 'lucide-react';

export default function AboutPage() {
  const { storeName, contactPhone, contactEmail } = useSettingsStore();

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Fancy Hero Header */}
      <section className="relative pt-32 pb-24 px-6 border-b border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-muted/30 to-background pointer-events-none -z-10" />
        <div className="max-w-5xl mx-auto space-y-8 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-medium tracking-tight text-foreground">
            About {storeName || 'ShegAddis'}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-light">
            Your destination for quality sneakers, shoes, and everyday apparel in Addis Ababa.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto space-y-32">
          
          {/* Story (Editorial Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
            <div className="md:col-span-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-4">
                Our Story
              </h2>
            </div>
            <div className="md:col-span-8 prose prose-lg text-foreground/90 leading-relaxed">
              <p className="text-xl leading-relaxed font-medium mb-8">
                Finding quality footwear and clothing in Addis Ababa shouldn't be a challenge. We established {storeName || 'ShegAddis'} to provide a reliable destination for premium sneakers, shoes, and modern apparel, delivered directly to you.
              </p>
              <p className="text-muted-foreground">
                We offer a carefully selected range of items to complete your look. We prioritize consistent quality, reliable fits, and a seamless shopping experience.
              </p>
            </div>
          </div>

          {/* Features / Principles (Editorial Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
            <div className="md:col-span-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-4">
                How we work
              </h2>
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-12">
              <div className="group space-y-5">
                <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 ease-out shadow-sm border border-border/30">
                  <Leaf className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-xl mb-3">Made to last</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    Quality matters. We care about durable materials, solid stitching, and products that stand up to everyday life.
                  </p>
                </div>
              </div>

              <div className="group space-y-5">
                <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 ease-out shadow-sm border border-border/30">
                  <MapPin className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-xl mb-3">Delivered to you</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    No need to navigate traffic. We bring your order straight to your door, anywhere in Addis Ababa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact (Premium Call-to-Action) */}
          <div className="bg-card rounded-3xl p-10 md:p-16 border border-border/60 text-center space-y-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
            
            <div className="space-y-4 max-w-2xl mx-auto relative z-10">
              <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight">Questions? Let's talk.</h2>
              <p className="text-lg text-muted-foreground">We're always happy to help with orders, sizing, or anything else you might need.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              {contactPhone && (
                <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors shadow-md">
                  Call {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-border/80 bg-background/50 hover:bg-muted font-medium transition-colors shadow-sm">
                  Email Us
                </a>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
