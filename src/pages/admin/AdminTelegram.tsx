import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, RefreshCw, Trash2, Check, ExternalLink, Loader2, Pencil, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { useProductStore } from '@/store/productStore';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import { DraftEditDialog, type DraftParsed } from '@/components/admin/DraftEditDialog';
import { QuickPostIngestDialog } from '@/components/admin/QuickPostIngestDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getTelegramSources,
  createTelegramSource,
  deleteTelegramSource,
  getTelegramDrafts,
  triggerTelegramScrape,
  updateTelegramDraft,
  deleteTelegramDraft,
  clearAllTelegramDrafts,
  importTelegramDraft,
  type TelegramSource,
  type TelegramDraft,
} from '@/lib/api';

export default function AdminTelegram() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<TelegramSource[]>(() => {
    try {
      const raw = localStorage.getItem('shegaddis_telegram_sources');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read cached sources', err);
    }
    return [];
  });
  const [drafts, setDrafts] = useState<TelegramDraft[]>([]);
  const [newChannel, setNewChannel] = useState('');
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primaryByDraft, setPrimaryByDraft] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<any>(null);
  const [quickIngestOpen, setQuickIngestOpen] = useState(false);
  const [quickIngestChannel, setQuickIngestChannel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importingDraftId, setImportingDraftId] = useState<string | null>(null);
  const deliveryFee = useSettingsStore((s) => s.deliveryFee);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  const loadData = async () => {
    try {
      setLoading(true);
      const [srcs, drs] = await Promise.all([
        getTelegramSources(),
        getTelegramDrafts(),
      ]);
      if (srcs && srcs.length > 0) {
        setSources(srcs);
        try {
          localStorage.setItem('shegaddis_telegram_sources', JSON.stringify(srcs));
        } catch (err) {
          console.warn('Could not save sources to localStorage', err);
        }
      } else {
        // If server returned empty, check if we had cached sources and push them up
        try {
          const raw = localStorage.getItem('shegaddis_telegram_sources');
          if (raw) {
            const cached: TelegramSource[] = JSON.parse(raw);
            if (cached.length > 0) {
              setSources(cached);
              // restore to server
              for (const s of cached) {
                createTelegramSource(s.channelUsername, s.title).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.warn('Could not restore sources from localStorage', err);
        }
      }
      setDrafts(drs);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load telegram pipeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDraftSaved = async (
    draftId: string,
    parsed: DraftParsed,
    images: string[],
    primaryIndex: number
  ) => {
    try {
      const updated = await updateTelegramDraft(draftId, parsed, images);
      setDrafts((arr) => arr.map((d) => (d.id === draftId ? updated : d)));
      setPrimaryByDraft((m) => ({ ...m, [draftId]: primaryIndex }));
      toast.success('Draft updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update draft');
    }
  };

  const addSource = async () => {
    const clean = newChannel
      .replace(/^@/, '')
      .replace(/^https?:\/\/t\.me\//, '')
      .replace(/\/$/, '')
      .trim();
    if (!clean) return;

    try {
      const created = await createTelegramSource(clean, `@${clean}`);
      setNewChannel('');
      toast.success(`Added @${clean}`);
      setSources((prev) => {
        const next = [...prev.filter((x) => x.id !== created.id), created];
        try {
          localStorage.setItem('shegaddis_telegram_sources', JSON.stringify(next));
        } catch (err) {
          console.warn('Could not cache added source', err);
        }
        return next;
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add source');
    }
  };

  const removeSource = async (id: string) => {
    try {
      await deleteTelegramSource(id);
      setSources((prev) => {
        const next = prev.filter((x) => x.id !== id);
        try {
          localStorage.setItem('shegaddis_telegram_sources', JSON.stringify(next));
        } catch (err) {
          console.warn('Could not cache removed source', err);
        }
        return next;
      });
      toast.success('Channel source removed');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove source');
    }
  };

  const scrapeNow = async (channelUsername?: string) => {
    setScraping(true);
    try {
      const res = await triggerTelegramScrape(channelUsername);
      if (res.success) {
        if (res.count > 0) {
          toast.success(`Imported ${res.count} new draft(s) from ${channelUsername ? '@' + channelUsername : 'active channels'}`);
        } else {
          toast.info(res.message || 'No new posts found on channel (already up to date or empty).', {
            description: 'You can paste post text & images directly using "Paste Telegram Post".',
            action: {
              label: 'Paste Post',
              onClick: () => {
                if (channelUsername) setQuickIngestChannel(channelUsername);
                setQuickIngestOpen(true);
              },
            },
            duration: 6000,
          });
        }
        loadData();
      } else {
        toast.info(res.message, {
          description: 'Telegram prevents direct web crawlers for this channel. Click below to paste your post text & photos.',
          action: {
            label: 'Paste Post',
            onClick: () => {
              if (channelUsername) setQuickIngestChannel(channelUsername);
              setQuickIngestOpen(true);
            },
          },
          duration: 8000,
        });
      }
    } catch (err: any) {
      const msg = err.message || 'Scrape check completed';
      toast.info(msg, {
        description: 'Click below to paste post content directly.',
        action: {
          label: 'Paste Post',
          onClick: () => {
            if (channelUsername) setQuickIngestChannel(channelUsername);
            setQuickIngestOpen(true);
          },
        },
        duration: 8000,
      });
    } finally {
      setScraping(false);
    }
  };

  const [importingAll, setImportingAll] = useState(false);

  const handleImport = async (draftId: string) => {
    if (importingDraftId) return;
    setImportingDraftId(draftId);
    try {
      const primaryIdx = primaryByDraft[draftId] ?? 0;
      const res = await importTelegramDraft(draftId, primaryIdx);
      setDrafts((arr) => arr.filter((x) => x.id !== draftId));
      if (res?.product) {
        useProductStore.getState().upsert(res.product);
      }
      await fetchProducts(true);
      toast.success(`Imported "${res.product.name}" into store catalog!`, {
        description: `Price: ${formatETB(res.product.price)} (incl. ${formatETB(deliveryFee)} delivery fee)`,
        action: {
          label: 'View in Products',
          onClick: () => navigate('/admin/products'),
        },
        duration: 6000,
      });
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportingDraftId(null);
    }
  };

  const handleImportAll = async () => {
    if (drafts.length === 0 || importingAll) return;
    setImportingAll(true);
    let count = 0;
    for (const d of [...drafts]) {
      try {
        const primaryIdx = primaryByDraft[d.id] ?? 0;
        const res = await importTelegramDraft(d.id, primaryIdx);
        if (res?.product) {
          useProductStore.getState().upsert(res.product);
        }
        count++;
      } catch (err) {
        console.warn('Batch import draft failed:', d.id, err);
      }
    }
    await fetchProducts(true);
    loadData();
    setImportingAll(false);
    toast.success(`Successfully imported ${count} draft(s) into your active store catalog!`, {
      action: {
        label: 'View Products',
        onClick: () => navigate('/admin/products'),
      },
    });
  };

  const confirmDeleteDraft = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleting(true);
    // Optimistically update the UI instantly
    setDrafts((arr) => arr.filter((x) => x.id !== id));
    setDeleteTarget(null);
    try {
      await deleteTelegramDraft(id);
      toast.success('Draft removed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete draft');
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  const confirmClearAllDrafts = async () => {
    setDeleting(true);
    setDrafts([]);
    setClearAllConfirmOpen(false);
    try {
      await clearAllTelegramDrafts();
      toast.success('All drafts cleared');
    } catch {
      toast.error('Failed to clear drafts from server');
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sources Card */}
      <section className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold">Telegram Sources</h2>
            <p className="text-sm text-muted-foreground">
              Addis Ababa public channels to ingest. Ingestion pipeline extracts products, sizes, colors, and prices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQuickIngestChannel(sources[0]?.channelUsername || '');
                setQuickIngestOpen(true);
              }}
              className="font-heading font-semibold text-xs tracking-wider uppercase"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Paste Telegram Post
            </Button>
            <Button
              onClick={() => scrapeNow()}
              disabled={scraping || sources.length === 0}
              className="font-heading font-semibold text-xs tracking-wider uppercase"
            >
              {scraping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Scrape Channels Now
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add your channel: @your_channel or https://t.me/your_channel"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSource()}
            className="max-w-md"
          />
          <Button variant="default" onClick={addSource} disabled={!newChannel.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add Channel
          </Button>
        </div>

        <div className="divide-y divide-border">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="font-medium text-sm">@{s.channelUsername}</div>
                <div className="text-xs text-muted-foreground">
                  {s.lastScrapedAt ? `Last scraped ${new Date(s.lastScrapedAt).toLocaleString()}` : 'Ready to scrape'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => {
                  setQuickIngestChannel(s.channelUsername);
                  setQuickIngestOpen(true);
                }}
                title={`Paste post from @${s.channelUsername}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Paste Post
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                disabled={scraping}
                onClick={() => scrapeNow(s.channelUsername)}
                title={`Scrape @${s.channelUsername}`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Scrape Channel
              </Button>
              <a
                href={`https://t.me/${s.channelUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground p-1.5"
                title="Open in Telegram"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeSource(s.id)}
                title="Remove channel"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {sources.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border my-2">
              <p className="font-medium text-foreground mb-1">No channels added yet</p>
              <p className="text-xs text-muted-foreground">Enter your Telegram channel username or URL above to add it. It will be saved permanently.</p>
            </div>
          )}
        </div>
      </section>

      {/* Ingested Drafts Review */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              Ingested Drafts for Review
              <Badge variant="secondary">{drafts.length}</Badge>
            </h2>
            {drafts.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold gradient-primary text-primary-foreground"
                  disabled={importingAll}
                  onClick={handleImportAll}
                >
                  {importingAll ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Importing ({drafts.length})...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Import All to Store ({drafts.length})
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setClearAllConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Price rule: Imports with delivery fee ({formatETB(deliveryFee)}) included in price.
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {drafts.map((d) => {
            const p = d.parsed || {};
            const rawPrice = Number(p.price || 0);
            const calculatedFinalPrice = rawPrice + deliveryFee;
            const primaryIdx = primaryByDraft[d.id] ?? 0;
            const previewImage = getImageUrl(d.images?.[primaryIdx] || d.images?.[0]) || FALLBACK_PRODUCT_IMAGE;

            return (
              <div key={d.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col justify-between shadow-sm">
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted group">
                    <img
                      src={previewImage}
                      alt="Draft preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-background/90 backdrop-blur-sm border border-border">
                        {d.channel} #{d.messageId}
                      </span>
                    </div>
                    {/* Top right quick delete button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: d.id, name: p.name || 'Untitled Draft' })}
                      title="Delete draft item"
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-background/90 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground border border-border shadow-sm transition-all z-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-semibold text-base truncate">{p.name || 'Untitled Draft'}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.shortDescription || d.rawCaption}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditing({
                              id: d.id,
                              channel: d.channel,
                              message_id: d.messageId,
                              post_url: null,
                              raw_caption: d.rawCaption,
                              images: d.images || [],
                              parsed: p,
                              status: d.status,
                              created_at: d.createdAt,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
                          onClick={() => setDeleteTarget({ id: d.id, name: p.name || 'Untitled Draft' })}
                          title="Delete draft"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded border border-border/60">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Scraped Price</span>
                        <span className="font-semibold">{formatETB(rawPrice)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Final Catalog Price</span>
                        <span className="font-semibold text-accent">{formatETB(calculatedFinalPrice)}</span>
                      </div>
                    </div>

                    {/* Image Selector & Omit Controls */}
                    {d.images && d.images.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold uppercase text-muted-foreground">
                            Images ({d.images.length}) • Click to select Card Cover
                          </span>
                          <span className="text-accent text-[10px] font-medium">
                            Cover #{primaryIdx + 1}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {d.images.map((imgUrl, imgIdx) => {
                            const isCardCover = imgIdx === primaryIdx;
                            return (
                              <div key={imgUrl + imgIdx} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrimaryByDraft((prev) => ({ ...prev, [d.id]: imgIdx }));
                                    toast.success(`Set image #${imgIdx + 1} as cover for "${p.name || 'draft'}"`);
                                  }}
                                  className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all block relative ${
                                    isCardCover
                                      ? 'border-primary ring-2 ring-primary/40 shadow-sm'
                                      : 'border-border opacity-70 hover:opacity-100'
                                  }`}
                                  title={isCardCover ? 'Current card cover image' : `Click to make image #${imgIdx + 1} card cover`}
                                >
                                  <img
                                    src={getImageUrl(imgUrl) || FALLBACK_PRODUCT_IMAGE}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                                  />
                                  {isCardCover && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <Check className="h-3.5 w-3.5 text-primary drop-shadow font-bold" />
                                    </div>
                                  )}
                                </button>

                                {/* Omit / Remove Image Button */}
                                {d.images.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const nextImages = d.images.filter((_, idx) => idx !== imgIdx);
                                      try {
                                        const updated = await updateTelegramDraft(d.id, p, nextImages);
                                        setDrafts((arr) => arr.map((item) => (item.id === d.id ? updated : item)));
                                        setPrimaryByDraft((prev) => ({
                                          ...prev,
                                          [d.id]: imgIdx === primaryIdx ? 0 : imgIdx < primaryIdx ? primaryIdx - 1 : primaryIdx,
                                        }));
                                        toast.success('Image removed from draft');
                                      } catch (err: any) {
                                        toast.error(err.message || 'Failed to remove image');
                                      }
                                    }}
                                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition z-10"
                                    title="Omit image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {p.sizes && p.sizes.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Sizes:</span>
                        <span className="font-medium bg-muted px-2 py-0.5 rounded border border-border/60">
                          {p.sizes.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex gap-2">
                  <Button
                    className="flex-1 font-heading font-semibold text-xs tracking-wider uppercase"
                    disabled={importingDraftId === d.id}
                    onClick={() => handleImport(d.id)}
                  >
                    {importingDraftId === d.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1.5" /> Approve & Import to Store
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-border px-3 shrink-0"
                    onClick={() => setDeleteTarget({ id: d.id, name: p.name || 'Untitled Draft' })}
                    title="Delete draft item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {drafts.length === 0 && !loading && (
            <div className="col-span-2 py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No pending drafts. Click "Scrape Channels Now" to ingest telegram posts.
            </div>
          )}
        </div>
      </section>

      {/* Edit Dialog */}
      {editing && (
        <DraftEditDialog
          draft={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={handleDraftSaved}
          onDelete={(draftId, draftName) => setDeleteTarget({ id: draftId, name: draftName })}
        />
      )}

      {/* Quick Paste Post Dialog */}
      <QuickPostIngestDialog
        open={quickIngestOpen}
        onOpenChange={setQuickIngestOpen}
        defaultChannel={quickIngestChannel}
        onCreated={(newDraft) => {
          setDrafts((prev) => [newDraft, ...prev]);
        }}
      />

      {/* Delete Single Draft Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Draft Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> from your ingested drafts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteDraft();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Drafts Confirmation Dialog */}
      <AlertDialog open={clearAllConfirmOpen} onOpenChange={setClearAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear All Pending Drafts
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {drafts.length} pending draft items and reset scrape checkpoint markers so you can re-scrape your channels cleanly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmClearAllDrafts();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Clearing...' : 'Yes, Clear All Drafts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
