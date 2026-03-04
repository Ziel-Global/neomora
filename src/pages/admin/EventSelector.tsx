import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventStore, EMSEvent, generateId } from '@/lib/emsStore';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    Search,
    Calendar,
    MapPin,
    LogOut,
    MoreHorizontal,
    Edit,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
    Published: 'from-emerald-500 to-teal-600',
    Ongoing: 'from-blue-500 to-indigo-600',
    Draft: 'from-slate-400 to-slate-500',
    Closed: 'from-rose-400 to-rose-600',
};

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Published': return 'success';
        case 'Ongoing': return 'info';
        case 'Draft': return 'default';
        case 'Closed': return 'secondary';
        default: return 'default';
    }
};

/* ─── Initials avatar when no logo is set ─── */
const EventInitials: React.FC<{ name: string; status: string }> = ({ name, status }) => {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');
    const gradient = STATUS_COLORS[status] ?? 'from-violet-500 to-purple-700';
    return (
        <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient} select-none`}
        >
            <span className="text-white font-bold text-3xl tracking-widest opacity-90">
                {initials}
            </span>
        </div>
    );
};

/* ─── Empty form state ─── */
const emptyForm = () => ({
    name: '',
    theme: '',
    startDate: '',
    endDate: '',
    city: '',
    venues: '',
    status: 'Draft' as EMSEvent['status'],
    eventType: 'individual' as 'individual' | 'team-based' | 'hybrid',
    selectedSports: [] as string[],
    allowTeamRegistration: false,
    logo: '',
});

const EventSelector: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isRtl = i18n.language === 'ar';

    const [events, setEvents] = useState<EMSEvent[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('all');
    const [isCreateOpen, setCreate] = useState(false);
    const [isEditOpen, setEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<EMSEvent | null>(null);
    const [form, setForm] = useState(emptyForm());
    const logoInputRef = useRef<HTMLInputElement>(null);

    const load = () => setEvents(eventStore.getAll());

    useEffect(() => { load(); }, []);

    /* ─── Logo upload handler ─── */
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error(t('events.logo_size_error') || 'Logo must be under 2 MB'); return; }
        const reader = new FileReader();
        reader.onload = ev => setForm(f => ({ ...f, logo: ev.target?.result as string }));
        reader.readAsDataURL(file);
    };

    /* ─── Sport toggle ─── */
    const toggleSport = (id: string) =>
        setForm(f => ({
            ...f,
            selectedSports: f.selectedSports.includes(id)
                ? f.selectedSports.filter(s => s !== id)
                : [...f.selectedSports, id],
        }));

    /* ─── CRUD ─── */
    const handleCreate = () => {
        if (!form.name || !form.startDate || !form.endDate || !form.city) {
            toast.error(t('common.fill_required') || 'Please fill in all required fields');
            return;
        }
        const sportCategories = form.selectedSports
            .map(id => SPORT_CATEGORIES.find(c => c.id === id))
            .filter(Boolean) as EMSEvent['sportCategories'];

        eventStore.create({
            name: form.name,
            theme: form.theme,
            startDate: form.startDate,
            endDate: form.endDate,
            city: form.city,
            venues: form.venues.split('\n').filter(v => v.trim()),
            status: form.status,
            logo: form.logo || undefined,
            clientGroups: ['VVIP', 'VIP', 'Athlete', 'Official', 'Judge', 'Media', 'Fan'],
            eventType: form.eventType,
            sportCategories,
            allowTeamRegistration: form.allowTeamRegistration,
        });

        toast.success(t('events.created_success', { name: form.name }));
        setCreate(false);
        setForm(emptyForm());
        load();
    };

    const openEdit = (ev: EMSEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditTarget(ev);
        setForm({
            name: ev.name,
            theme: ev.theme,
            startDate: ev.startDate,
            endDate: ev.endDate,
            city: ev.city,
            venues: ev.venues.join('\n'),
            status: ev.status,
            eventType: ev.eventType ?? 'individual',
            selectedSports: ev.sportCategories?.map(c => c.id) ?? [],
            allowTeamRegistration: ev.allowTeamRegistration ?? false,
            logo: ev.logo ?? '',
        });
        setEdit(true);
    };

    const handleUpdate = () => {
        if (!editTarget) return;
        const sportCategories = form.selectedSports
            .map(id => SPORT_CATEGORIES.find(c => c.id === id))
            .filter(Boolean) as EMSEvent['sportCategories'];

        eventStore.update(editTarget.id, {
            name: form.name,
            theme: form.theme,
            startDate: form.startDate,
            endDate: form.endDate,
            city: form.city,
            venues: form.venues.split('\n').filter(v => v.trim()),
            status: form.status,
            logo: form.logo || undefined,
            eventType: form.eventType,
            sportCategories,
            allowTeamRegistration: form.allowTeamRegistration,
        });

        toast.success(t('events.updated_success'));
        setEdit(false);
        setEditTarget(null);
        setForm(emptyForm());
        load();
    };

    const handleDelete = (ev: EMSEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        eventStore.delete(ev.id);
        toast.success(t('events.deleted_success', { name: ev.name }));
        load();
    };

    /* ─── Filtered list ─── */
    const filtered = events.filter(ev => {
        const matchSearch = ev.name.toLowerCase().includes(search.toLowerCase()) ||
            ev.city.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
        return matchSearch && matchStatus;
    });

    /* ─── Shared form fields JSX ─── */
    const FormFields = (
        <div className="grid gap-4 py-2">
            {/* Logo upload */}
            <div className="grid gap-2">
                <Label>{t('events.event_logo')} <span className="text-muted-foreground text-xs">{t('events.logo_limit')}</span></Label>
                <div className="flex items-center gap-3">
                    {form.logo ? (
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden border">
                            <img src={form.logo} alt="logo" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, logo: '' }))}
                                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        {form.logo ? t('events.change_logo') : t('events.upload_logo')}
                    </Button>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="f-name">{t('events.name_label')} <span className="text-destructive">*</span></Label>
                <Input id="f-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="f-theme">{t('events.theme_label')}</Label>
                <Input id="f-theme" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="f-start">{t('events.start_label')} <span className="text-destructive">*</span></Label>
                    <Input id="f-start" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="f-end">{t('events.end_label')} <span className="text-destructive">*</span></Label>
                    <Input id="f-end" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="f-city">{t('events.city_label')} <span className="text-destructive">*</span></Label>
                <Input id="f-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="f-venues">{t('events.venues_label')}</Label>
                <Textarea id="f-venues" placeholder={t('events.venues_placeholder')} value={form.venues} onChange={e => setForm(f => ({ ...f, venues: e.target.value }))} />
            </div>
            <div className="grid gap-2">
                <Label>{t('events.type')}</Label>
                <Select value={form.eventType} onValueChange={(v: 'individual' | 'team-based' | 'hybrid') => setForm(f => ({ ...f, eventType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="individual">{t('events.type_individual')}</SelectItem>
                        <SelectItem value="team-based">{t('events.type_team')}</SelectItem>
                        <SelectItem value="hybrid">{t('events.type_hybrid')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {(form.eventType === 'team-based' || form.eventType === 'hybrid') && (
                <>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="f-teamreg"
                            checked={form.allowTeamRegistration}
                            onCheckedChange={c => setForm(f => ({ ...f, allowTeamRegistration: !!c }))}
                        />
                        <Label htmlFor="f-teamreg" className="font-normal">{t('events.allow_team_reg')}</Label>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('events.sport_cats')}</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                            {SPORT_CATEGORIES.map(sport => (
                                <div key={sport.id} className="flex items-center gap-2">
                                    <Checkbox id={sport.id} checked={form.selectedSports.includes(sport.id)} onCheckedChange={() => toggleSport(sport.id)} />
                                    <Label htmlFor={sport.id} className="font-normal text-sm cursor-pointer">{sport.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            <div className="grid gap-2">
                <Label>{t('events.status_label')}</Label>
                <Select value={form.status} onValueChange={(v: EMSEvent['status']) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Draft">{t('common.draft')}</SelectItem>
                        <SelectItem value="Published">{t('common.published')}</SelectItem>
                        <SelectItem value="Ongoing">{t('common.ongoing')}</SelectItem>
                        <SelectItem value="Closed">{t('common.closed')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* ─── Top bar ─── */}
            <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-6 py-0 flex items-center gap-4 h-16 shadow-sm">
                <img src="/neomoraWhite.png" alt="NeoMora" className="h-6 w-auto" />
                <span className="text-sidebar-foreground/40 font-light text-lg mx-1">|</span>
                <span className="text-sidebar-foreground font-semibold text-base tracking-tight">
                    {t('events.admin_portal')}
                </span>

                <div className={`${isRtl ? 'mr-auto' : 'ml-auto'} flex items-center gap-3`}>
                    <LanguageSwitcher />
                    <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                        <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center font-medium text-sidebar-accent-foreground">
                            {user?.name?.charAt(0) ?? 'A'}
                        </div>
                        <span className="hidden sm:block">{user?.name ?? t('common.admin')}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        onClick={logout}
                    >
                        <LogOut className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                        {t('common.sign_out')}
                    </Button>
                </div>
            </header>

            {/* ─── Main content ─── */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Page heading */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('events.your_events')}</h1>
                        <p className="text-muted-foreground mt-1">
                            {t('events.select_event_manage')}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        className="shrink-0 gap-2 shadow-sm"
                        onClick={() => { setForm(emptyForm()); setCreate(true); }}
                    >
                        <Plus className="h-5 w-5" />
                        {t('events.add_new_event')}
                    </Button>
                </div>

                {/* Search + filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                        <Input
                            placeholder={t('events.search_events_city')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={isRtl ? 'pr-10' : 'pl-10'}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatus}>
                        <SelectTrigger className="w-full sm:w-44">
                            <SelectValue placeholder={t('events.all_statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('events.all_statuses')}</SelectItem>
                            <SelectItem value="Draft">{t('common.draft')}</SelectItem>
                            <SelectItem value="Published">{t('common.published')}</SelectItem>
                            <SelectItem value="Ongoing">{t('common.ongoing')}</SelectItem>
                            <SelectItem value="Closed">{t('common.closed')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Empty state */}
                {events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                            <Calendar className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">{t('events.no_events_yet')}</h2>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            {t('events.create_first_event_desc')}
                        </p>
                        <Button onClick={() => { setForm(emptyForm()); setCreate(true); }}>
                            <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                            {t('events.create_first_event')}
                        </Button>
                    </div>
                )}

                {/* No search results */}
                {events.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        {t('events.no_search_results')}
                    </div>
                )}

                {/* Event cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(ev => (
                        <div
                            key={ev.id}
                            onClick={() => navigate(`/admin/events/${ev.id}/dashboard`)}
                            className="
                group relative bg-card rounded-2xl overflow-hidden border border-border
                shadow-sm hover:shadow-lg hover:-translate-y-1
                transition-all duration-200 cursor-pointer
              "
                        >
                            {/* Logo / initials area */}
                            <div className="h-40 w-full overflow-hidden">
                                {ev.logo ? (
                                    <img
                                        src={ev.logo}
                                        alt={ev.name}
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <EventInitials name={ev.name} status={ev.status} />
                                )}
                            </div>

                            {/* Status badge — overlaid top-right (respecting LTR/RTL) */}
                            <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`}>
                                <StatusBadge
                                    status={ev.status}
                                    variant={getStatusVariant(ev.status)}
                                />
                            </div>

                            {/* Action menu — top-left (respecting LTR/RTL) */}
                            <div className={`absolute top-2 ${isRtl ? 'left-2' : 'right-2'}`} onClick={e => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 bg-black/30 hover:bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isRtl ? 'start' : 'end'}>
                                        <DropdownMenuItem onClick={e => openEdit(ev, e)}>
                                            <Edit className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} /> {t('common.edit')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={e => handleDelete(ev, e)}
                                        >
                                            <Trash2 className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} /> {t('common.delete')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Card body */}
                            <div className="p-4 text-start">
                                <h3 className="font-semibold text-base leading-tight mb-1 truncate" title={ev.name}>
                                    {ev.name}
                                </h3>
                                {ev.theme && (
                                    <p className="text-xs text-muted-foreground truncate mb-2">{ev.theme}</p>
                                )}
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-2">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        {ev.startDate} – {ev.endDate}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        {ev.city}
                                    </span>
                                </div>

                                {ev.venues.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {ev.venues.slice(0, 2).map((v, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5">{v}</Badge>
                                        ))}
                                        {ev.venues.length > 2 && (
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                                +{ev.venues.length - 2}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {/* "Enter event" CTA */}
                                <div className={`mt-4 pt-3 border-t border-border flex items-center ${isRtl ? 'justify-start' : 'justify-end'}`}>
                                    <span className="text-xs font-medium text-primary group-hover:underline">
                                        {t('events.open_dashboard')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* ─── Create Dialog ─── */}
            <Dialog open={isCreateOpen} onOpenChange={open => { setCreate(open); if (!open) setForm(emptyForm()); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="text-start">{t('events.create_new')}</DialogTitle>
                        <DialogDescription className="text-start">{t('events.create_desc')}</DialogDescription>
                    </DialogHeader>
                    {FormFields}
                    <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-end gap-2 pt-2`}>
                        <Button variant="outline" onClick={() => { setCreate(false); setForm(emptyForm()); }}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleCreate}>{t('events.create_event')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Edit Dialog ─── */}
            <Dialog open={isEditOpen} onOpenChange={open => { setEdit(open); if (!open) { setEditTarget(null); setForm(emptyForm()); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="text-start">{t('events.edit_event')}</DialogTitle>
                        <DialogDescription className="text-start">{t('events.edit_desc')}</DialogDescription>
                    </DialogHeader>
                    {FormFields}
                    <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-end gap-2 pt-2`}>
                        <Button variant="outline" onClick={() => { setEdit(false); setEditTarget(null); setForm(emptyForm()); }}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleUpdate}>{t('common.save_changes')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default EventSelector;
