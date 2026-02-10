import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { equipment, getModuleStats } from '@/data/additionalMockData';
import { Package, Truck, AlertTriangle, CheckCircle, Search, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const EquipmentPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<typeof equipment[0] | null>(null);

  const stats = getModuleStats().equipment;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Deployed': return 'success';
      case 'Stored': return 'info';
      case 'Cleared': return 'info';
      case 'In Transit': return 'warning';
      case 'Customs Hold': return 'destructive';
      case 'Declared': return 'default';
      default: return 'default';
    }
  };

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || eq.customsStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment Tracking"
        description="Manage equipment declarations and customs documentation"
        action={
          <Button><Plus className="h-4 w-4 mr-2" />Register Equipment</Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Deployed" value={stats.deployed} icon={CheckCircle} trend={{ value: 50, isPositive: true }} />
        <StatsCard title="In Transit" value={stats.inTransit} icon={Truck} />
        <StatsCard title="Customs Hold" value={stats.hold} icon={AlertTriangle} />
        <StatsCard title="Total Items" value={stats.total} icon={Package} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, owner, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Declared">Declared</SelectItem>
            <SelectItem value="In Transit">In Transit</SelectItem>
            <SelectItem value="Cleared">Cleared</SelectItem>
            <SelectItem value="Stored">Stored</SelectItem>
            <SelectItem value="Deployed">Deployed</SelectItem>
            <SelectItem value="Customs Hold">Customs Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Carnet</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.map((eq) => (
              <TableRow key={eq.id}>
                <TableCell className="font-medium">{eq.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{eq.serialNumber}</code>
                </TableCell>
                <TableCell>{eq.ownerName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{eq.category}</Badge>
                </TableCell>
                <TableCell>
                  {eq.carnetNumber ? (
                    <code className="text-xs">{eq.carnetNumber}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>${eq.declaredValue.toLocaleString()}</TableCell>
                <TableCell>
                  <StatusBadge status={eq.customsStatus} variant={getStatusVariant(eq.customsStatus)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEquipment(eq)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Equipment Detail Dialog */}
      <Dialog open={!!selectedEquipment} onOpenChange={() => setSelectedEquipment(null)}>
        <DialogContent className="max-w-lg">
          {selectedEquipment && (
            <>
              <DialogHeader>
                <DialogTitle>Equipment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedEquipment.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedEquipment.category}</p>
                  </div>
                  <StatusBadge status={selectedEquipment.customsStatus} variant={getStatusVariant(selectedEquipment.customsStatus)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Serial Number</Label>
                    <p className="font-mono">{selectedEquipment.serialNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Declared Value</Label>
                    <p className="font-medium">${selectedEquipment.declaredValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Owner</Label>
                    <p className="font-medium">{selectedEquipment.ownerName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">ATA Carnet</Label>
                    <p className="font-mono">{selectedEquipment.carnetNumber || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-sm">Status Timeline</Label>
                  <div className="mt-3 space-y-3">
                    {selectedEquipment.timeline.map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${i === selectedEquipment.timeline.length - 1 ? 'bg-primary' : 'bg-muted'}`} />
                          {i < selectedEquipment.timeline.length - 1 && <div className="w-0.5 h-full bg-muted" />}
                        </div>
                        <div className="pb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{entry.status}</Badge>
                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentPage;
