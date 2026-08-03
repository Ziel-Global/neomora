import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventStore, EMSEvent, generateId } from '@/lib/emsStore';
import { getEvents, createEvent, deleteEvent, updateEvent } from '@/api/eventApi';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
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
    DialogFooter,
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
    Loader2,
    AlertTriangle,
    Image as ImageIcon,
    Sparkles,
    Users,
    Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateEventForm, EventFormErrors, EventFormField } from '@/lib/eventFormValidation';
import { getSportsBoardsForEvent } from '@/lib/sportsBoards';
import { CountryCombobox } from '@/components/common/CountryCombobox';

const EVENT_TYPE_GROUP: Record<string, string> = {
    individual: 'individual-games',
    'team-based': 'team-based-games',
    hybrid: 'hybrid-games',
};

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
    country: '',
    city: '',
    venues: '',
    status: 'Draft' as EMSEvent['status'],
    eventType: 'individual' as 'individual' | 'team-based' | 'hybrid',
    selectedSports: [] as string[],
    allowTeamRegistration: false,
    logo: '',
});

/* Stable form helpers — must live outside EventSelector or inputs remount on every keystroke */
const RequiredLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
    <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-foreground">
        {children}
        <span className="ms-1 text-destructive">*</span>
    </Label>
);

const FieldHint = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>
);

const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="text-sm text-destructive">{message}</p> : null;

const FormSection = ({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
}) => (
    <section className="space-y-3.5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
                )}
            </div>
        </div>
        <div className="space-y-3.5">{children}</div>
    </section>
);

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
    const [isCreating, setIsCreating] = useState(false);
    const [isListLoading, setIsListLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<EMSEvent | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [formErrors, setFormErrors] = useState<EventFormErrors>({});
    const logoInputRef = useRef<HTMLInputElement>(null);

    const clearFieldError = (field: EventFormField) => {
        setFormErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const inputErrorClass = (field: EventFormField) =>
        formErrors[field] ? 'border-destructive focus-visible:ring-destructive' : '';

    const load = async () => {
        try {
            setIsListLoading(true);
            const data = await getEvents();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            toast.error('Failed to fetch events');
        } finally {
            setIsListLoading(false);
        }
    };

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
    const handleCreate = async () => {
        if (!validateForm()) return;
        const sportCategories = form.selectedSports
            .map(id => SPORT_CATEGORIES.find(c => c.id === id))
            .filter(Boolean)
            .map(c => ({
                name: EVENT_TYPE_GROUP[form.eventType],
                subCategory: c!.name,
            }));

        const cities = form.city.split('\n').map(c => c.trim()).filter(Boolean);

        try {
            setIsCreating(true);
            await createEvent({
                name: form.name,
                theme: form.theme,
                startDate: form.startDate,
                endDate: form.endDate,
                city: cities.join(', '),
                country: form.country,
                cities,
                eventType: form.eventType,
                venues: form.venues.split('\n').filter(v => v.trim()),
                sportCategories,
                status: form.status,
            });

            toast.success(t('events.created_success', { name: form.name }));
            setCreate(false);
            setForm(emptyForm());
            setFormErrors({});
            load();
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error('Failed to create event');
        } finally {
            setIsCreating(false);
        }
    };

    const openEdit = (ev: EMSEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditTarget(ev);
        setForm({
            name: ev.name,
            theme: ev.theme,
            startDate: ev.startDate,
            endDate: ev.endDate,
            country: ev.country || '',
            city: (ev.cities && ev.cities.length > 0 ? ev.cities : [ev.city]).filter(Boolean).join('\n'),
            venues: ev.venues.join('\n'),
            status: ev.status,
            eventType: ev.eventType ?? 'individual',
            selectedSports: ev.sportCategories?.map(c => c.id) ?? [],
            allowTeamRegistration: ev.allowTeamRegistration ?? false,
            logo: ev.logo ?? '',
        });
        setEdit(true);
    };

    const handleUpdate = async () => {
        if (!editTarget) return;
        if (!validateForm()) return;
        const sportCategories = form.selectedSports
            .map(id => SPORT_CATEGORIES.find(c => c.id === id))
            .filter(Boolean)
            .map(c => ({
                name: EVENT_TYPE_GROUP[form.eventType],
                subCategory: c!.name,
            }));

        const updateCities = form.city.split('\n').map(c => c.trim()).filter(Boolean);

        try {
            setIsUpdating(true);
            await updateEvent(editTarget.id, {
                name: form.name,
                theme: form.theme,
                startDate: form.startDate,
                endDate: form.endDate,
                city: updateCities.join(', '),
                country: form.country,
                cities: updateCities,
                eventType: form.eventType,
                venues: form.venues.split('\n').filter(v => v.trim()),
                sportCategories,
                status: form.status,
            });

            toast.success(t('events.updated_success'));
            setEdit(false);
            setEditTarget(null);
            setForm(emptyForm());
            setFormErrors({});
            load();
        } catch (error) {
            console.error('Error updating event:', error);
            toast.error('Failed to update event');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = (ev: EMSEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteTarget(ev);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await deleteEvent(deleteTarget.id);
            toast.success(t('events.deleted_success', { name: deleteTarget.name }));
            setIsDeleteDialogOpen(false);
            setDeleteTarget(null);
            load();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to delete event');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ─── Filtered list ─── */
    const filtered = events.filter(ev => {
        const matchSearch = ev.name.toLowerCase().includes(search.toLowerCase()) ||
            ev.city.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const validateForm = (): boolean => {
        const result = validateEventForm(form, t);
        setFormErrors(result.errors);
        if (!result.valid && result.firstError) {
            toast.error(result.firstError);
        }
        return result.valid;
    };

    /* ─── Shared form fields JSX ─── */
    const FormFields = (
        <div className="space-y-4">
            {/* Branding */}
            <FormSection
                icon={ImageIcon}
                title="Branding"
                description="Optional logo shown on invitations, badges, and the event card."
            >
                <div className="grid gap-2">
                    <Label className="text-[13px] font-semibold text-foreground">
                        {t('events.event_logo')}
                        <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                            {t('events.logo_limit')}
                        </span>
                    </Label>
                    <div
                        className={cn(
                            'flex flex-col gap-3 rounded-xl border border-dashed p-3 transition-colors sm:flex-row sm:items-center',
                            form.logo
                                ? 'border-primary/25 bg-primary/[0.03]'
                                : 'border-border/80 bg-muted/30 hover:border-primary/30 hover:bg-muted/50',
                        )}
                    >
                        {form.logo ? (
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                                <img src={form.logo} alt="Event logo" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, logo: '' }))}
                                    className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background shadow-sm transition-colors hover:bg-foreground"
                                    title="Remove logo"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                            >
                                <Upload className="h-5 w-5" />
                                <span className="text-[10px] font-semibold uppercase tracking-wide">Add</span>
                            </button>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Square PNG or JPG works best. Max 2 MB.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    {form.logo ? t('events.change_logo') : t('events.upload_logo')}
                                </Button>
                                {form.logo && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => setForm(f => ({ ...f, logo: '' }))}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                    </div>
                </div>
            </FormSection>

            {/* Basics */}
            <FormSection
                icon={Sparkles}
                title="Basics"
                description="The name and theme participants will recognise."
            >
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="f-name">{t('events.name_label')}</RequiredLabel>
                    <Input
                        id="f-name"
                        placeholder="e.g. World Aquatics Championships"
                        value={form.name}
                        onChange={e => { clearFieldError('name'); setForm(f => ({ ...f, name: e.target.value })); }}
                        className={cn('h-10 bg-background', inputErrorClass('name'))}
                        required
                    />
                    <FieldError message={formErrors.name} />
                </div>
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="f-theme">{t('events.theme_label')}</RequiredLabel>
                    <Input
                        id="f-theme"
                        placeholder="e.g. Excellence · Unity · Legacy"
                        value={form.theme}
                        onChange={e => { clearFieldError('theme'); setForm(f => ({ ...f, theme: e.target.value })); }}
                        className={cn('h-10 bg-background', inputErrorClass('theme'))}
                        required
                    />
                    <FieldError message={formErrors.theme} />
                    <FieldHint>A short line used on invitations and marketing surfaces.</FieldHint>
                </div>
            </FormSection>

            {/* Format */}
            <FormSection
                icon={Users}
                title="Format"
                description="Who can register and which sports apply."
            >
                <div className="grid gap-2">
                    <RequiredLabel>{t('events.type')}</RequiredLabel>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {([
                            { value: 'individual' as const, label: t('events.type_individual'), hint: 'Solo participants' },
                            { value: 'team-based' as const, label: t('events.type_team'), hint: 'Delegations & teams' },
                            { value: 'hybrid' as const, label: t('events.type_hybrid'), hint: 'Both formats' },
                        ]).map((option) => {
                            const isActive = form.eventType === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        clearFieldError('eventType');
                                        clearFieldError('selectedSports');
                                        setForm(f => ({ ...f, eventType: option.value }));
                                    }}
                                    className={cn(
                                        'rounded-xl border px-3 py-3 text-start transition-all duration-200',
                                        isActive
                                            ? 'border-primary/40 bg-primary/[0.06] ring-2 ring-primary/20 shadow-sm'
                                            : 'border-border/70 bg-background hover:border-primary/25 hover:bg-muted/40',
                                    )}
                                >
                                    <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                                        {option.label}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</p>
                                </button>
                            );
                        })}
                    </div>
                    <FieldError message={formErrors.eventType} />
                </div>

                {(form.eventType === 'team-based' || form.eventType === 'hybrid') && (
                    <>
                        <label
                            htmlFor="f-teamreg"
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                                form.allowTeamRegistration
                                    ? 'border-primary/30 bg-primary/[0.04]'
                                    : 'border-border/70 bg-background hover:bg-muted/30',
                            )}
                        >
                            <Checkbox
                                id="f-teamreg"
                                checked={form.allowTeamRegistration}
                                onCheckedChange={c => setForm(f => ({ ...f, allowTeamRegistration: !!c }))}
                                className="mt-0.5"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{t('events.allow_team_reg')}</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                    Managers can submit whole teams for this event.
                                </p>
                            </div>
                        </label>

                        <div className="grid gap-2">
                            <RequiredLabel>{t('events.sport_cats')}</RequiredLabel>
                            <FieldHint>Select every sport category this event covers.</FieldHint>
                            <div
                                className={cn(
                                    'grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border bg-muted/20 p-2.5 sm:grid-cols-2',
                                    formErrors.selectedSports ? 'border-destructive' : 'border-border/70',
                                )}
                            >
                                {SPORT_CATEGORIES.map(sport => {
                                    const checked = form.selectedSports.includes(sport.id);
                                    return (
                                        <label
                                            key={sport.id}
                                            htmlFor={sport.id}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                                                checked
                                                    ? 'bg-primary/10 text-foreground'
                                                    : 'hover:bg-background',
                                            )}
                                        >
                                            <Checkbox
                                                id={sport.id}
                                                checked={checked}
                                                onCheckedChange={() => {
                                                    clearFieldError('selectedSports');
                                                    toggleSport(sport.id);
                                                }}
                                            />
                                            <span className="font-medium">{sport.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <FieldError message={formErrors.selectedSports} />
                        </div>

                        {form.country && form.selectedSports.length > 0 && (
                            <div className="grid gap-2">
                                <Label className="text-[13px] font-semibold text-foreground">Sports Boards</Label>
                                <div className="flex flex-wrap gap-2">
                                    {getSportsBoardsForEvent(
                                        form.country,
                                        form.selectedSports
                                            .map(id => SPORT_CATEGORIES.find(s => s.id === id)?.name)
                                            .filter((name): name is string => Boolean(name)),
                                    ).map(board => (
                                        <Badge key={board} variant="secondary">{board}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </FormSection>

            {/* When & where */}
            <FormSection
                icon={MapPin}
                title="When & where"
                description="Dates and locations for the event programme."
            >
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <RequiredLabel htmlFor="f-start">{t('events.start_label')}</RequiredLabel>
                        <Input
                            id="f-start"
                            type="date"
                            value={form.startDate}
                            min={todayStr}
                            onChange={e => { clearFieldError('startDate'); setForm(f => ({ ...f, startDate: e.target.value })); }}
                            onPaste={e => e.preventDefault()}
                            className={cn('h-10 bg-background', inputErrorClass('startDate'))}
                            required
                        />
                        <FieldError message={formErrors.startDate} />
                    </div>
                    <div className="grid gap-2">
                        <RequiredLabel htmlFor="f-end">{t('events.end_label')}</RequiredLabel>
                        <Input
                            id="f-end"
                            type="date"
                            value={form.endDate}
                            min={form.startDate || todayStr}
                            onChange={e => { clearFieldError('endDate'); setForm(f => ({ ...f, endDate: e.target.value })); }}
                            onPaste={e => e.preventDefault()}
                            className={cn('h-10 bg-background', inputErrorClass('endDate'))}
                            required
                        />
                        <FieldError message={formErrors.endDate} />
                    </div>
                </div>
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="f-country">Country</RequiredLabel>
                    <CountryCombobox
                        id="f-country"
                        value={form.country}
                        onChange={(value) => {
                            clearFieldError('country');
                            setForm(f => ({ ...f, country: value }));
                        }}
                        error={Boolean(formErrors.country)}
                    />
                    <FieldError message={formErrors.country} />
                </div>
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="f-city">{t('events.city_label')}</RequiredLabel>
                    <Textarea
                        id="f-city"
                        placeholder="List cities (one per line)"
                        value={form.city}
                        onChange={e => { clearFieldError('city'); setForm(f => ({ ...f, city: e.target.value })); }}
                        className={cn('min-h-[72px] resize-y bg-background', inputErrorClass('city'))}
                        required
                    />
                    <FieldError message={formErrors.city} />
                    <FieldHint>One city per line — an event can span multiple cities.</FieldHint>
                </div>
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="f-venues">{t('events.venues_label')}</RequiredLabel>
                    <Textarea
                        id="f-venues"
                        placeholder={t('events.venues_placeholder')}
                        value={form.venues}
                        onChange={e => { clearFieldError('venues'); setForm(f => ({ ...f, venues: e.target.value })); }}
                        className={cn('min-h-[88px] resize-y bg-background', inputErrorClass('venues'))}
                        required
                    />
                    <FieldError message={formErrors.venues} />
                    <FieldHint>One venue per line — used on travel and accreditation screens.</FieldHint>
                </div>
            </FormSection>

            {/* Status */}
            <FormSection
                icon={Flag}
                title="Visibility"
                description="Draft events stay hidden until you publish them."
            >
                <div className="grid gap-2">
                    <RequiredLabel>{t('events.status_label')}</RequiredLabel>
                    <Select
                        value={form.status}
                        onValueChange={(v: EMSEvent['status']) => {
                            clearFieldError('status');
                            setForm(f => ({ ...f, status: v }));
                        }}
                    >
                        <SelectTrigger className={cn('h-10 bg-background', inputErrorClass('status'))}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Draft">{t('common.draft')}</SelectItem>
                            <SelectItem value="Published">{t('common.published')}</SelectItem>
                            <SelectItem value="Ongoing">{t('common.ongoing')}</SelectItem>
                            <SelectItem value="Closed">{t('common.closed')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError message={formErrors.status} />
                </div>
            </FormSection>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
            <AdminHomeHeader />

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

                {/* Loading state */}
                {isListLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-[280px] rounded-2xl bg-muted animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isListLoading && events.length === 0 && (
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
                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
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
            <Dialog open={isCreateOpen} onOpenChange={open => { setCreate(open); if (!open) { setForm(emptyForm()); setFormErrors({}); } }}>
                <DialogContent
                    className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl"
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-5 py-5 pe-12 text-start sm:px-6">
                        <div className="flex items-start gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                                <Calendar className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                                    Event operations
                                </p>
                                <DialogTitle className="text-xl font-semibold tracking-tight">
                                    {t('events.create_new')}
                                </DialogTitle>
                                <DialogDescription className="text-sm leading-relaxed">
                                    {t('events.create_desc')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/15 px-4 py-4 sm:px-6 sm:py-5">
                        {FormFields}
                    </div>

                    <DialogFooter className="shrink-0 gap-2 border-t bg-card px-4 py-3.5 sm:flex-row sm:justify-between sm:px-6">
                        <p className="hidden text-xs text-muted-foreground sm:block">
                            Required fields are marked with <span className="text-destructive">*</span>
                        </p>
                        <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                            <Button
                                variant="outline"
                                className="h-10"
                                onClick={() => { setCreate(false); setForm(emptyForm()); }}
                                disabled={isCreating}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button className="h-10 gap-2 shadow-sm" onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                {t('events.create_event')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Edit Dialog ─── */}
            <Dialog open={isEditOpen} onOpenChange={open => { setEdit(open); if (!open) { setEditTarget(null); setForm(emptyForm()); setFormErrors({}); } }}>
                <DialogContent
                    className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl"
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-5 py-5 pe-12 text-start sm:px-6">
                        <div className="flex items-start gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                                <Edit className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                                    Event operations
                                </p>
                                <DialogTitle className="text-xl font-semibold tracking-tight">
                                    {t('events.edit_event')}
                                </DialogTitle>
                                <DialogDescription className="text-sm leading-relaxed">
                                    {editTarget?.name
                                        ? `Updating ${editTarget.name}`
                                        : t('events.edit_desc')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/15 px-4 py-4 sm:px-6 sm:py-5">
                        {FormFields}
                    </div>

                    <DialogFooter className="shrink-0 gap-2 border-t bg-card px-4 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                        <Button
                            variant="outline"
                            className="h-10"
                            onClick={() => { setEdit(false); setEditTarget(null); setForm(emptyForm()); }}
                            disabled={isUpdating}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button className="h-10 gap-2 shadow-sm" onClick={handleUpdate} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('common.save_changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation Dialog ─── */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center">Are you sure?</DialogTitle>
                        <DialogDescription className="text-center">
                            This will permanently delete the event <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-center gap-3 pt-4`}>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />}
                            Delete Event
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default EventSelector;
