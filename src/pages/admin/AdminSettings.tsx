import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/store/settingsStore';
import { useBannerStore } from '@/store/bannerStore';
import { getSettings, updateSettings } from '@/lib/api';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import {
  Truck,
  Megaphone,
  Store,
  Phone,
  Mail,
  Send,
  Instagram,
  Cloud,
  CheckCircle2,
  Upload,
  Loader2,
  Building2,
  CreditCard,
  Image as ImageIcon,
  ShieldCheck,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';

export default function AdminSettings() {
  const { deliveryFee, setDeliveryFee, setSettings, fetchSettings } = useSettingsStore();
  const { banner, updateBanner } = useBannerStore();
  const [fee, setFee] = useState(deliveryFee.toString());
  const [bannerForm, setBannerForm] = useState({ ...banner });
  const [storeName, setStoreName] = useState('ShegAddis');
  const [contactPhone, setContactPhone] = useState('+251 911 234 567');
  const [contactEmail, setContactEmail] = useState('contact@shegaddis.com');
  const [telegramHandle, setTelegramHandle] = useState('@ShegAddis');
  const [instagramHandle, setInstagramHandle] = useState('@shegaddis_et');
  const [storeLogo, setStoreLogo] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [heroImage2, setHeroImage2] = useState('');
  const [heroImage3, setHeroImage3] = useState('');
  const [mobileHeroImage, setMobileHeroImage] = useState('');
  const [mobileHeroImage2, setMobileHeroImage2] = useState('');
  const [mobileHeroImage3, setMobileHeroImage3] = useState('');
  
  // Cloudinary settings
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('hfj6afxi');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState('shegaddis_uploads');
  const [testUploading, setTestUploading] = useState(false);
  const [lastUploadedCloudinaryUrl, setLastUploadedCloudinaryUrl] = useState<string | null>(null);

  // Bank transfer accounts
  const [cbeAccount, setCbeAccount] = useState('1000123456789 (ShegAddis Fashion / Addis Ababa)');
  const [telebirrNumber, setTelebirrNumber] = useState('0911234567 (ShegAddis Store)');
  const [awashAccount, setAwashAccount] = useState('0132049281900 (ShegAddis Trading)');

  const [saving, setSaving] = useState(false);
  const testFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef2 = useRef<HTMLInputElement>(null);
  const heroFileInputRef3 = useRef<HTMLInputElement>(null);
  const mobileHeroFileInputRef = useRef<HTMLInputElement>(null);
  const mobileHeroFileInputRef2 = useRef<HTMLInputElement>(null);
  const mobileHeroFileInputRef3 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s: any) => {
      if (s) {
        if (s.deliveryFee !== undefined) {
          setFee(String(s.deliveryFee));
          setDeliveryFee(s.deliveryFee);
        }
        if (s.banner) {
          setBannerForm(s.banner);
          updateBanner(s.banner);
        }
        if (s.storeName) setStoreName(s.storeName);
        if (s.contactPhone) setContactPhone(s.contactPhone);
        if (s.contactEmail) setContactEmail(s.contactEmail);
        if (s.telegramHandle) setTelegramHandle(s.telegramHandle);
        if (s.instagramHandle) setInstagramHandle(s.instagramHandle);
        if (s.storeLogo) setStoreLogo(s.storeLogo);
        if (s.heroImage) setHeroImage(s.heroImage);
        if (s.heroImage2) setHeroImage2(s.heroImage2);
        if (s.heroImage3) setHeroImage3(s.heroImage3);
        if (s.mobileHeroImage) setMobileHeroImage(s.mobileHeroImage);
        if (s.mobileHeroImage2) setMobileHeroImage2(s.mobileHeroImage2);
        if (s.mobileHeroImage3) setMobileHeroImage3(s.mobileHeroImage3);
        if (s.cloudinaryCloudName) setCloudinaryCloudName(s.cloudinaryCloudName);
        if (s.cloudinaryUploadPreset) setCloudinaryUploadPreset(s.cloudinaryUploadPreset);
        if (s.cbeAccount) setCbeAccount(s.cbeAccount);
        if (s.telebirrNumber) setTelebirrNumber(s.telebirrNumber);
        if (s.awashAccount) setAwashAccount(s.awashAccount);
        setSettings(s);
      }
    });
  }, [setDeliveryFee, updateBanner, setSettings]);

  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/test');
      setLastUploadedCloudinaryUrl(url);
      toast.success('Successfully uploaded file to Cloudinary CDN!');
    } catch (err: any) {
      console.error(err);
      toast.error('Cloudinary upload test failed: ' + (err.message || 'Error'));
    } finally {
      setTestUploading(false);
      if (testFileInputRef.current) testFileInputRef.current.value = '';
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero');
      setHeroImage(url);
      toast.success('Hero banner uploaded to Cloudinary');
    } catch (err: any) {
      toast.error('Failed to upload hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    }
  };

  const handleHeroUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero');
      setHeroImage2(url);
      toast.success('Second hero banner uploaded');
    } catch (err: any) {
      toast.error('Failed to upload hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (heroFileInputRef2.current) heroFileInputRef2.current.value = '';
    }
  };

  const handleHeroUpload3 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero');
      setHeroImage3(url);
      toast.success('Third hero banner uploaded');
    } catch (err: any) {
      toast.error('Failed to upload hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (heroFileInputRef3.current) heroFileInputRef3.current.value = '';
    }
  };

  const handleMobileHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero-mobile');
      setMobileHeroImage(url);
      toast.success('Mobile hero banner uploaded');
    } catch (err: any) {
      toast.error('Failed to upload mobile hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (mobileHeroFileInputRef.current) mobileHeroFileInputRef.current.value = '';
    }
  };

  const handleMobileHeroUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero-mobile');
      setMobileHeroImage2(url);
      toast.success('Second mobile hero banner uploaded');
    } catch (err: any) {
      toast.error('Failed to upload mobile hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (mobileHeroFileInputRef2.current) mobileHeroFileInputRef2.current.value = '';
    }
  };

  const handleMobileHeroUpload3 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'shegaddis/hero-mobile');
      setMobileHeroImage3(url);
      toast.success('Third mobile hero banner uploaded');
    } catch (err: any) {
      toast.error('Failed to upload mobile hero image: ' + err.message);
    } finally {
      setTestUploading(false);
      if (mobileHeroFileInputRef3.current) mobileHeroFileInputRef3.current.value = '';
    }
  };

  const handleSaveAll = async () => {
    const parsedFee = parseFloat(fee);
    if (isNaN(parsedFee) || parsedFee < 0) {
      toast.error('Please enter a valid delivery fee.');
      return;
    }
    if (!bannerForm.title.trim()) {
      toast.error('Banner title is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        deliveryFee: parsedFee,
        banner: bannerForm,
        storeName,
        contactPhone,
        contactEmail,
        telegramHandle,
        instagramHandle,
        storeLogo,
        heroImage,
        heroImage2,
        heroImage3,
        mobileHeroImage,
        mobileHeroImage2,
        mobileHeroImage3,
        cloudinaryCloudName,
        cloudinaryUploadPreset,
        cbeAccount,
        telebirrNumber,
        awashAccount,
      };

      const res = await updateSettings(payload);

      setDeliveryFee(parsedFee);
      updateBanner(bannerForm);
      setSettings(res || payload);
      toast.success('All Store & Cloudinary settings persisted to Neon PostgreSQL database!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBannerField = <K extends keyof typeof bannerForm>(key: K, value: typeof bannerForm[K]) => {
    setBannerForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-heading text-2xl font-bold">Store Configuration & Storage</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> Neon DB Synced
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage Cloudinary media storage, delivery fees, bank accounts, and campaigns.</p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="gradient-primary text-primary-foreground font-heading font-semibold text-xs tracking-wider uppercase h-10 px-5 shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {saving ? 'Saving to DB…' : 'Save Changes'}
        </Button>
      </div>

      {/* Cloudinary File Storage Configuration Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-semibold text-base">Cloudinary File & Media Storage</h2>
                <Badge variant="secondary" className="bg-sky-100 text-sky-800 text-[10px] font-mono font-medium">
                  Active Provider
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Permanent cloud CDN used for all product images, category covers, and payment receipts.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Ready for Uploads
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cloud Name</Label>
            <Input
              value={cloudinaryCloudName}
              onChange={(e) => setCloudinaryCloudName(e.target.value)}
              className="mt-1.5 font-mono text-sm"
              placeholder="e.g. hfj6afxi"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Your Cloudinary account cloud identifier.</p>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Upload Preset (Unsigned)</Label>
            <Input
              value={cloudinaryUploadPreset}
              onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
              className="mt-1.5 font-mono text-sm"
              placeholder="e.g. shegaddis_uploads"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Preset configured in Cloudinary Settings → Upload.</p>
          </div>
        </div>

        {/* Live Upload Test */}
        <div className="mt-5 p-4 rounded-md bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Test Cloudinary Storage Connection</p>
            <p className="text-[11px] text-muted-foreground">Upload an image to verify direct delivery via Cloudinary CDN.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={testFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleTestUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testFileInputRef.current?.click()}
              disabled={testUploading}
              className="text-xs"
            >
              {testUploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {testUploading ? 'Uploading to Cloudinary...' : 'Upload Test File'}
            </Button>
          </div>
        </div>

        {lastUploadedCloudinaryUrl && (
          <div className="mt-3 p-3 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate font-mono text-[11px]">{lastUploadedCloudinaryUrl}</span>
            </div>
            <a
              href={lastUploadedCloudinaryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-700 underline shrink-0 ml-2"
            >
              View in CDN
            </a>
          </div>
        )}
      </div>

      {/* Ethiopian Bank Accounts & Payment Details */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base">Payment & Bank Transfer Details</h2>
            <p className="text-xs text-muted-foreground">Shown to customers during checkout for Bank Transfer and Telebirr orders.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" /> Commercial Bank of Ethiopia (CBE) Account
            </Label>
            <Input
              value={cbeAccount}
              onChange={(e) => setCbeAccount(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. 1000123456789 (ShegAddis Fashion)"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-sky-500" /> Telebirr Merchant / Phone
              </Label>
              <Input
                value={telebirrNumber}
                onChange={(e) => setTelebirrNumber(e.target.value)}
                className="mt-1.5"
                placeholder="e.g. 0911234567"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-600" /> Awash / Dashen Bank Account
              </Label>
              <Input
                value={awashAccount}
                onChange={(e) => setAwashAccount(e.target.value)}
                className="mt-1.5"
                placeholder="e.g. 0132049281900 (ShegAddis Trading)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Fee Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base">Addis Ababa Delivery Fee</h2>
            <p className="text-xs text-muted-foreground">Standard courier rate applied at checkout across all Addis sub-cities.</p>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Delivery Fee (ETB)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="mt-1.5 max-w-xs font-mono"
            placeholder="150"
          />
        </div>
      </div>

      {/* Promo Announcement Banner */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-accent/15 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-base">Homepage Campaign Banner</h2>
              <p className="text-xs text-muted-foreground">Displays promotional messaging across the storefront.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="banner-toggle" className="text-xs uppercase tracking-wider font-semibold">
              {bannerForm.enabled ? 'Active' : 'Disabled'}
            </Label>
            <Switch
              id="banner-toggle"
              checked={bannerForm.enabled}
              onCheckedChange={(checked) => updateBannerField('enabled', checked)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Banner Headline</Label>
            <Input
              value={bannerForm.title}
              onChange={(e) => updateBannerField('title', e.target.value)}
              className="mt-1.5"
              placeholder="Mid-Season Collection — Addis Delivery Free Above 3,000 ETB"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={bannerForm.description}
              onChange={(e) => updateBannerField('description', e.target.value)}
              className="mt-1.5"
              placeholder="Premium footwear & handpicked apparel delivered to your doorstep across Addis Ababa."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Button Text</Label>
              <Input
                value={bannerForm.buttonText}
                onChange={(e) => updateBannerField('buttonText', e.target.value)}
                className="mt-1.5"
                placeholder="Shop Collection"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link URL</Label>
              <Input
                value={bannerForm.linkUrl}
                onChange={(e) => updateBannerField('linkUrl', e.target.value)}
                className="mt-1.5 font-mono text-xs"
                placeholder="/products?sortBy=newest"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={bannerForm.startDate || ''}
                onChange={(e) => updateBannerField('startDate', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={bannerForm.endDate || ''}
                onChange={(e) => updateBannerField('endDate', e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Brand & Social Handles */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
            <Store className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base">Store Contact & Channels</h2>
            <p className="text-xs text-muted-foreground">Contact information rendered in store footer and order emails.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone Number
            </Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" /> Telegram Handle
            </Label>
            <Input
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Instagram className="h-3 w-3" /> Instagram Handle
            </Label>
            <Input
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* Hero Configuration */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base">Hero Section</h2>
            <p className="text-xs text-muted-foreground">Customize the sliding images on the home page hero.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Hero 1 */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slide 1: First Hero Image</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={heroFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroUpload}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => heroFileInputRef.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              {heroImage && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={heroImage} alt="Hero 1 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <Label className="text-xs uppercase tracking-wider text-muted-foreground mt-6 block">Slide 1: Mobile Hero Image (Optional)</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={mobileHeroImage}
                onChange={(e) => setMobileHeroImage(e.target.value)}
                placeholder="Mobile image URL... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={mobileHeroFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMobileHeroUpload}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mobileHeroFileInputRef.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Mobile Image'}
              </Button>
              {mobileHeroImage && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={mobileHeroImage} alt="Mobile Hero 1 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          
          {/* Hero 2 */}
          <div className="border-t border-border pt-6">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slide 2: Second Hero Image</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={heroImage2}
                onChange={(e) => setHeroImage2(e.target.value)}
                placeholder="https://... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={heroFileInputRef2}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroUpload2}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => heroFileInputRef2.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              {heroImage2 && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={heroImage2} alt="Hero 2 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <Label className="text-xs uppercase tracking-wider text-muted-foreground mt-6 block">Slide 2: Mobile Hero Image (Optional)</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={mobileHeroImage2}
                onChange={(e) => setMobileHeroImage2(e.target.value)}
                placeholder="Mobile image URL... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={mobileHeroFileInputRef2}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMobileHeroUpload2}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mobileHeroFileInputRef2.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Mobile Image'}
              </Button>
              {mobileHeroImage2 && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={mobileHeroImage2} alt="Mobile Hero 2 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          
          {/* Hero 3 */}
          <div className="border-t border-border pt-6">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slide 3: Third Hero Image</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={heroImage3}
                onChange={(e) => setHeroImage3(e.target.value)}
                placeholder="https://... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={heroFileInputRef3}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroUpload3}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => heroFileInputRef3.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              {heroImage3 && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={heroImage3} alt="Hero 3 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <Label className="text-xs uppercase tracking-wider text-muted-foreground mt-6 block">Slide 3: Mobile Hero Image (Optional)</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <Input
                value={mobileHeroImage3}
                onChange={(e) => setMobileHeroImage3(e.target.value)}
                placeholder="Mobile image URL... or upload below"
                className="flex-1"
              />
            </div>
            
            <input
              ref={mobileHeroFileInputRef3}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMobileHeroUpload3}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mobileHeroFileInputRef3.current?.click()}
                disabled={testUploading}
                className="gap-2"
              >
                {testUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {testUploading ? 'Uploading...' : 'Upload Mobile Image'}
              </Button>
              {mobileHeroImage3 && (
                <div className="h-10 w-10 border rounded overflow-hidden">
                  <img src={mobileHeroImage3} alt="Mobile Hero 3 preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-6">
              Note: Desktop images will be cropped to fit the hero banner dimensions (recommended: 2400x1200). Mobile images are recommended to be vertical (e.g. 1080x1350).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
