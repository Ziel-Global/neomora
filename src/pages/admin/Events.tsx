import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { eventStore, invitationStore, registrationStore, EMSEvent } from '@/lib/emsStore';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import { Calendar, MapPin, Users, Plus, Search, Eye, Edit, MoreHorizontal, Trash2, Flag, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';


const EventsPage: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EMSEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<EMSEvent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EMSEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
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
  });

  // Load events from store
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    setEvents(eventStore.getAll());
  };

  const resetForm = () => {
    setFormData({
      name: '',
      theme: '',
      startDate: '',
      endDate: '',
      city: '',
      venues: '',
      status: 'Draft',
      eventType: 'individual',
      selectedSports: [],
      allowTeamRegistration: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.startDate || !formData.endDate || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    const sportCategories = formData.selectedSports.map(sportId => {
      const cat = SPORT_CATEGORIES.find(c => c.id === sportId);
      return cat ? { id: cat.id, name: cat.name, subCategories: cat.subCategories } : null;
    }).filter(Boolean) as EMSEvent['sportCategories'];

    const newEvent = eventStore.create({
      name: formData.name,
      theme: formData.theme,
      startDate: formData.startDate,
      endDate: formData.endDate,
      city: formData.city,
      venues: formData.venues.split('\n').filter(v => v.trim()),
      status: formData.status,
      clientGroups: ['VVIP', 'VIP', 'Athlete', 'Official', 'Judge', 'Media', 'Fan'],
      eventType: formData.eventType,
      sportCategories: sportCategories,
      allowTeamRegistration: formData.allowTeamRegistration,
    });

    loadEvents();
    setIsCreateOpen(false);
    resetForm();
    toast.success(`Event "${newEvent.name}" created successfully`);
  };

  const handleEdit = (event: EMSEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      theme: event.theme,
      startDate: event.startDate,
      endDate: event.endDate,
      city: event.city,
      venues: event.venues.join('\n'),
      status: event.status,
      eventType: event.eventType || 'individual',
      selectedSports: event.sportCategories?.map(c => c.id) || [],
      allowTeamRegistration: event.allowTeamRegistration || false,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingEvent) return;

    const sportCategories = formData.selectedSports.map(sportId => {
      const cat = SPORT_CATEGORIES.find(c => c.id === sportId);
      return cat ? { id: cat.id, name: cat.name, subCategories: cat.subCategories } : null;
    }).filter(Boolean) as EMSEvent['sportCategories'];

    eventStore.update(editingEvent.id, {
      name: formData.name,
      theme: formData.theme,
      startDate: formData.startDate,
      endDate: formData.endDate,
      city: formData.city,
      venues: formData.venues.split('\n').filter(v => v.trim()),
      status: formData.status,
      eventType: formData.eventType,
      sportCategories: sportCategories,
      allowTeamRegistration: formData.allowTeamRegistration,
    });

    loadEvents();
    setIsEditOpen(false);
    setEditingEvent(null);
    resetForm();
    toast.success('Event updated successfully');
  };

  const handleDelete = (event: EMSEvent) => {
    eventStore.delete(event.id);
    loadEvents();
    toast.success(`Event "${event.name}" deleted`);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Published': return 'success';
      case 'Ongoing': return 'info';
      case 'Draft': return 'default';
      case 'Closed': return 'secondary';
      default: return 'default';
    }
  };

  const stats = {
    total: events.length,
    published: events.filter(e => e.status === 'Published').length,
    ongoing: events.filter(e => e.status === 'Ongoing').length,
    draft: events.filter(e => e.status === 'Draft').length,
  };

  const getEventStats = (eventId: string) => {
    const invitations = invitationStore.getByEvent(eventId);
    const registrations = registrationStore.getByEvent(eventId);

    return {
      invited: invitations.length,
      accepted: invitations.filter(i => i.status === 'Accepted').length,
      declined: invitations.filter(i => i.status === 'Declined').length,
      registered: registrations.length,
      confirmed: registrations.filter(r => r.status === 'Approved').length,
    };
  };

  const handleToggleSport = (sportId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSports: prev.selectedSports.includes(sportId)
        ? prev.selectedSports.filter(id => id !== sportId)
        : [...prev.selectedSports, sportId]
    }));
  };

  const formFieldsJsx = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t('events.name_label')}</Label>
        <Input
          id="name"
          placeholder={t('events.name_label')}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="theme">{t('events.theme_label')}</Label>
        <Input
          id="theme"
          placeholder={t('events.theme_label')}
          value={formData.theme}
          onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startDate">{t('events.start_label')}</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">{t('events.end_label')}</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">{t('events.city_label')}</Label>
        <Input
          id="city"
          placeholder={t('events.city_label')}
          value={formData.city}
          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="venues">{t('events.venues_label')}</Label>
        <Textarea
          id="venues"
          placeholder={t('events.venues_placeholder')}
          value={formData.venues}
          onChange={(e) => setFormData(prev => ({ ...prev, venues: e.target.value }))}
        />
      </div>

      {/* Event Type */}
      <div className="grid gap-2">
        <Label>{t('events.type')}</Label>
        <Select
          value={formData.eventType}
          onValueChange={(value: 'individual' | 'team-based' | 'hybrid') => setFormData(prev => ({ ...prev, eventType: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">{t('events.type_individual')}</SelectItem>
            <SelectItem value="team-based">{t('events.type_team')}</SelectItem>
            <SelectItem value="hybrid">{t('events.type_hybrid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Registration Toggle */}
      {(formData.eventType === 'team-based' || formData.eventType === 'hybrid') && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowTeamReg"
              checked={formData.allowTeamRegistration}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowTeamRegistration: !!checked }))}
            />
            <Label htmlFor="allowTeamReg" className="font-normal">
              {t('events.allow_team_reg')}
            </Label>
          </div>

          {/* Sport Categories */}
          <div className="grid gap-2">
            <Label>{t('events.sport_cats')}</Label>
            <p className="text-sm text-muted-foreground mb-2">{t('events.select_sports')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {SPORT_CATEGORIES.map(sport => (
                <div key={sport.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={sport.id}
                    checked={formData.selectedSports.includes(sport.id)}
                    onCheckedChange={() => handleToggleSport(sport.id)}
                  />
                  <Label htmlFor={sport.id} className="font-normal text-sm cursor-pointer">
                    {sport.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="status">{t('events.status_label')}</Label>
        <Select value={formData.status} onValueChange={(value: EMSEvent['status']) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue placeholder={t('events.status_label')} />
          </SelectTrigger>
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
    <div className="space-y-6">
      <PageHeader
        title={t('events.title')}
        description={t('events.description')}
        action={
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 me-2" />{t('events.create_event')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('events.create_new')}</DialogTitle>
                <DialogDescription>{t('events.create_desc')}</DialogDescription>
              </DialogHeader>
              {formFieldsJsx}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
                <Button onClick={handleCreate}>{t('events.create_event')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title={t('events.total_events')} value={stats.total} icon={Calendar} />
        <StatsCard title={t('events.published')} value={stats.published} icon={Calendar} trend={stats.published > 0 ? { value: 50, isPositive: true } : undefined} />
        <StatsCard title={t('events.ongoing')} value={stats.ongoing} icon={Calendar} />
        <StatsCard title={t('events.drafts')} value={stats.draft} icon={Calendar} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('events.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('events.status_label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('events.status_label')}</SelectItem>
            <SelectItem value="Draft">{t('common.draft')}</SelectItem>
            <SelectItem value="Published">{t('common.published')}</SelectItem>
            <SelectItem value="Ongoing">{t('common.ongoing')}</SelectItem>
            <SelectItem value="Closed">{t('common.closed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('events.no_events')}</h3>
            <p className="text-muted-foreground mb-4">{t('events.no_events_desc')}</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 me-2" />{t('events.create_event')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="grid gap-4">
        {filteredEvents.map((event) => {
          const eventStats = getEventStats(event.id);
          return (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{event.name}</h3>
                      <StatusBadge status={t(`common.${event.status.toLowerCase()}`)} variant={getStatusVariant(event.status)} />
                    </div>
                    {event.theme && <p className="text-muted-foreground text-sm">{event.theme}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {event.startDate} - {event.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {eventStats.invited} {t('events.invited')} · {eventStats.accepted} {t('events.accepted')} · {eventStats.registered} {t('events.registered')}
                      </span>
                    </div>
                    {event.venues.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.venues.slice(0, 2).map((venue, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{venue}</Badge>
                        ))}
                        {event.venues.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{event.venues.length - 2} {t('common.more')}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedEvent(event)}>
                      <Eye className="h-4 w-4 mr-1" />{t('common.view')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(event)}>
                          <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(event)}>
                          <Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingEvent(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('events.edit_event')}</DialogTitle>
            <DialogDescription>{t('events.edit_desc')}</DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingEvent(null); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdate}>{t('common.save_changes')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle>{selectedEvent.name}</DialogTitle>
                  <StatusBadge status={selectedEvent.status} variant={getStatusVariant(selectedEvent.status)} />
                </div>
                <DialogDescription>{t('events.event_details')}</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="summary" className="mt-4">
                <TabsList>
                  <TabsTrigger value="summary">{t('events.summary')}</TabsTrigger>
                  <TabsTrigger value="participants">{t('participants.title')}</TabsTrigger>
                  <TabsTrigger value="analytics">{t('events.analytics')}</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">{t('events.theme_label')}</Label>
                      <p className="font-medium">{selectedEvent.theme || t('common.no_theme')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">{t('events.city_label')}</Label>
                      <p className="font-medium">{selectedEvent.city}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">{t('events.start_label')}</Label>
                      <p className="font-medium">{selectedEvent.startDate}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">{t('events.end_label')}</Label>
                      <p className="font-medium">{selectedEvent.endDate}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('events.venues_label')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedEvent.venues.length > 0 ? selectedEvent.venues.map((venue, i) => (
                        <Badge key={i} variant="secondary">{venue}</Badge>
                      )) : <p className="text-muted-foreground text-sm">{t('common.no_venues')}</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('events.client_groups')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedEvent.clientGroups.map((group, i) => (
                        <Badge key={i} variant="outline">{group}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="participants" className="mt-4">
                  {(() => {
                    const stats = getEventStats(selectedEvent.id);
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold">{stats.invited}</p>
                              <p className="text-muted-foreground text-sm">{t('events.invited')}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                              <p className="text-muted-foreground text-sm">{t('events.accepted')}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
                              <p className="text-muted-foreground text-sm">{t('events.declined')}</p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold">{stats.registered}</p>
                              <p className="text-muted-foreground text-sm">{t('events.registered')}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
                              <p className="text-muted-foreground text-sm">{t('events.confirmed')}</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
                <TabsContent value="analytics" className="mt-4">
                  {(() => {
                    const stats = getEventStats(selectedEvent.id);
                    const conversionRate = stats.invited > 0 ? Math.round((stats.accepted / stats.invited) * 100) : 0;
                    const registrationRate = stats.accepted > 0 ? Math.round((stats.registered / stats.accepted) * 100) : 0;

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold">{stats.invited}</p>
                            <p className="text-muted-foreground text-sm">{t('events.invited')}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold">{stats.accepted}</p>
                            <p className="text-muted-foreground text-sm">{t('events.accepted')}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold">{conversionRate}%</p>
                            <p className="text-muted-foreground text-sm">{t('events.accept_rate')}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold">{registrationRate}%</p>
                            <p className="text-muted-foreground text-sm">{t('events.reg_rate')}</p>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;
