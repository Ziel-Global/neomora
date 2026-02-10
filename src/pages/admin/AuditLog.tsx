import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { auditLogs } from '@/data/additionalMockData';
import { History, Search, Filter, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const AuditLogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null);

  const actions = [...new Set(auditLogs.map(l => l.action))];
  const entities = [...new Set(auditLogs.map(l => l.entity))];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-success/10 text-success border-success/20';
      case 'UPDATE': return 'bg-primary/10 text-primary border-primary/20';
      case 'DELETE': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all system activities and changes"
        action={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />Export Log
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getActionColor('CREATE')}>CREATE</Badge>
              <div>
                <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'CREATE').length}</p>
                <p className="text-sm text-muted-foreground">Creates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getActionColor('UPDATE')}>UPDATE</Badge>
              <div>
                <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'UPDATE').length}</p>
                <p className="text-sm text-muted-foreground">Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getActionColor('DELETE')}>DELETE</Badge>
              <div>
                <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'DELETE').length}</p>
                <p className="text-sm text-muted-foreground">Deletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, details, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map(entity => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
              const { date, time } = formatTimestamp(log.timestamp);
              return (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="text-sm">
                      <p>{date}</p>
                      <p className="text-muted-foreground">{time}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.userName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{log.ipAddress}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{log.entity}</p>
                      <p className="text-muted-foreground font-mono text-xs">{log.entityId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.details}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle>Audit Log Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Timestamp</Label>
                    <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">IP Address</Label>
                    <p className="font-mono">{selectedLog.ipAddress}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{selectedLog.userName}</p>
                    <p className="text-xs text-muted-foreground">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Action</Label>
                    <Badge variant="outline" className={getActionColor(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Entity</Label>
                  <p className="font-medium">{selectedLog.entity}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedLog.entityId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Details</Label>
                  <p className="p-3 bg-muted rounded-lg text-sm">{selectedLog.details}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
