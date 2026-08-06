import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getEvents } from '@/api/eventApi';
import { getApprovedParticipantsFromRegistrations, AdminApprovedParticipant } from '@/api/participantApi';
import { cn } from '@/lib/utils';
import {
  Users,
  Loader2,
  Download,
  Home,
  ChevronRight,
  Building2,
  Globe2,
} from 'lucide-react';

// Shared look for premium tables across the admin app: fixed layout, airy
// rows, quiet header — mirrors the skin used on the Registrations page.
const TABLE_SKIN = [
  '[&>div.rounded-lg]:rounded-2xl [&>div.rounded-lg]:border-border/70 [&>div.rounded-lg]:shadow-sm',
  '[&_table]:w-full [&_table]:table-fixed',
  '[&_thead_tr]:border-b [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/40 [&_thead_tr:hover]:bg-muted/40',
  '[&_th]:h-12 [&_th]:px-3 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-muted-foreground/70',
  '[&_td]:px-3 [&_td]:py-3.5',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-border/40 [&_tbody_tr:last-child]:border-0',
  '[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.035]',
].join(' ');

const EventParticipantsPage: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<AdminApprovedParticipant[]>([]);
  const [eventName, setEventName] = useState<string>('');

  useEffect(() => {
    const loadEventData = async () => {
      setIsLoading(true);
      try {
        const events = await getEvents();
        const event = events.find((e: any) => e.id === eventId || e._id === eventId);
        if (event) {
          setEventName(event.name);
        }

        if (eventId) {
          const eventParticipants = await getApprovedParticipantsFromRegistrations(eventId);
          setParticipants(eventParticipants);
        } else {
          setParticipants([]);
        }
      } catch (error) {
        console.error('Failed to load event participants data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEventData();
  }, [eventId]);

  const stats = useMemo(() => {
    const organizations = new Set(
      participants.map((p) => p.organization?.trim()).filter(Boolean),
    );
    const nationalities = new Set(
      participants.map((p) => p.nationality?.trim()).filter(Boolean),
    );
    return {
      total: participants.length,
      organizations: organizations.size,
      nationalities: nationalities.size,
    };
  }, [participants]);

  const statCards = [
    {
      key: 'total',
      label: t('participants.title'),
      value: stats.total,
      hint: 'Approved for this event',
      icon: Users,
      bar: 'bg-status-success',
      iconWrap: 'bg-status-success-bg text-status-success',
      valueTone: 'text-status-success',
    },
    {
      key: 'organizations',
      label: t('participants.organization'),
      value: stats.organizations,
      hint: 'Distinct organizations represented',
      icon: Building2,
      bar: 'bg-status-info',
      iconWrap: 'bg-status-info-bg text-status-info',
      valueTone: 'text-status-info',
    },
    {
      key: 'nationalities',
      label: t('registrations.nationality'),
      value: stats.nationalities,
      hint: 'Countries represented',
      icon: Globe2,
      bar: 'bg-primary',
      iconWrap: 'bg-primary/10 text-primary',
      valueTone: 'text-primary',
    },
  ];

  const columns: Column<AdminApprovedParticipant>[] = [
    {
      key: 'name',
      header: t('common.participant'),
      sortable: true,
      className: 'min-w-0',
      accessor: (row) => {
        const firstName = row.firstName || '';
        const lastName = row.lastName || '';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
              <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-[11px] font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-start">
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {`${firstName} ${lastName}`.trim() || row.email || 'Unknown'}
              </p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'organization',
      header: t('participants.organization'),
      sortable: true,
      className: 'w-[180px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-foreground/80">{row.organization || '—'}</span>
      ),
    },
    {
      key: 'nationality',
      header: t('registrations.nationality'),
      sortable: true,
      className: 'w-[130px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-foreground/80">{row.nationality || '—'}</span>
      ),
    },
    {
      key: 'role',
      header: t('participants.role'),
      className: 'w-[150px]',
      accessor: (row) => (
        <span className="inline-block max-w-full truncate rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground/75">
          {row.teamRole || (row.role ? t(`common.${row.role.toLowerCase()}`, { defaultValue: row.role }) : '—')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      className: 'w-[120px]',
      accessor: (row) => (
        <StatusBadge status={row.registrationStatus || 'Approved'} size="sm" />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <div className="relative space-y-4">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <Link to="/admin/events" className="transition-colors hover:text-foreground">
              {t('events.title')}
            </Link>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <span className="font-medium text-foreground">{t('participants.title')}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                Event operations
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('participants.title')}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {eventName ? `Managing participants for ${eventName}` : `Management for Event ID: ${eventId}`}
              </p>
            </div>

            <Button variant="outline" className="h-10 shrink-0 gap-2 bg-card shadow-sm">
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </header>

      {/* Stat tiles */}
      {!isLoading && participants.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200"
              >
                <span className={cn('absolute inset-x-0 top-0 h-[3px]', card.bar)} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </p>
                    <p className={cn('mt-1 text-3xl font-semibold tabular-nums tracking-tight', card.valueTone)}>
                      {card.value}
                    </p>
                  </div>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.iconWrap)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.hint}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      ) : participants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('participants.no_participants')}</h3>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {t('participants.title')}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">
                    ({participants.length})
                  </span>
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  Everyone approved to attend this event
                </p>
              </div>
            </div>
          </div>

          <DataTable
            data={participants}
            columns={columns}
            keyExtractor={(row) => row.id}
            searchable
            searchKey={(row) => `${row.firstName} ${row.lastName} ${row.email} ${row.organization}`}
            searchPlaceholder={t('participants.search_placeholder')}
            className={TABLE_SKIN}
          />
        </section>
      )}
    </div>
  );
};

export default EventParticipantsPage;
