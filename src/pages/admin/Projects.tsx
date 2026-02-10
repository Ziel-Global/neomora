import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StatsCard } from '@/components/common/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Users,
  FileText,
  Upload,
  ChevronRight,
  MoreHorizontal,
  ArrowUpRight,
  Flag,
} from 'lucide-react';

type TaskStatus = 'Not Started' | 'In Progress' | 'At Risk' | 'Completed' | 'Closed';
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
type Workstream = 'Invitations' | 'Registration' | 'Travel' | 'Accommodation' | 'Visas' | 'Transportation' | 'Accreditation' | 'Equipment' | 'Crowd Management';

interface Task {
  id: string;
  title: string;
  description: string;
  workstream: Workstream;
  assignee: string;
  assigneeAvatar: string;
  dueDate: string;
  status: TaskStatus;
  priority: 'Low' | 'Medium' | 'High';
  progress: number;
  dependencies: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
}

interface Risk {
  id: string;
  title: string;
  description: string;
  workstream: Workstream;
  level: RiskLevel;
  impact: string;
  mitigation: string;
  owner: string;
  status: 'Open' | 'Mitigating' | 'Resolved';
  createdAt: string;
}

interface ProjectDocument {
  id: string;
  name: string;
  type: 'RFP' | 'Contract' | 'Manual' | 'Report' | 'Plan';
  workstream: Workstream | 'General';
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  version: string;
}

// Mock data
const tasks: Task[] = [
  {
    id: 'task-001',
    title: 'Finalize VIP invitation list',
    description: 'Complete the VIP guest list with all confirmed dignitaries',
    workstream: 'Invitations',
    assignee: 'Sarah Chen',
    assigneeAvatar: 'SC',
    dueDate: '2024-07-20',
    status: 'In Progress',
    priority: 'High',
    progress: 75,
    dependencies: [],
    subtasks: [
      { id: 'st-1', title: 'Gather government officials list', completed: true },
      { id: 'st-2', title: 'Confirm sponsor executives', completed: true },
      { id: 'st-3', title: 'Verify contact details', completed: false },
    ],
  },
  {
    id: 'task-002',
    title: 'Setup online registration portal',
    description: 'Configure and test the registration wizard flow',
    workstream: 'Registration',
    assignee: 'Mike Johnson',
    assigneeAvatar: 'MJ',
    dueDate: '2024-07-15',
    status: 'Completed',
    priority: 'High',
    progress: 100,
    dependencies: [],
    subtasks: [
      { id: 'st-4', title: 'Design form fields', completed: true },
      { id: 'st-5', title: 'Implement validation', completed: true },
      { id: 'st-6', title: 'User testing', completed: true },
    ],
  },
  {
    id: 'task-003',
    title: 'Negotiate airline partnerships',
    description: 'Secure group booking rates with major airlines',
    workstream: 'Travel',
    assignee: 'Emma Wilson',
    assigneeAvatar: 'EW',
    dueDate: '2024-07-25',
    status: 'At Risk',
    priority: 'High',
    progress: 40,
    dependencies: ['task-001'],
    subtasks: [
      { id: 'st-7', title: 'Contact Emirates', completed: true },
      { id: 'st-8', title: 'Contact Etihad', completed: false },
      { id: 'st-9', title: 'Finalize rates', completed: false },
    ],
  },
  {
    id: 'task-004',
    title: 'Hotel room block reservations',
    description: 'Reserve required room inventory across partner hotels',
    workstream: 'Accommodation',
    assignee: 'David Kim',
    assigneeAvatar: 'DK',
    dueDate: '2024-07-30',
    status: 'In Progress',
    priority: 'Medium',
    progress: 60,
    dependencies: ['task-001'],
    subtasks: [],
  },
  {
    id: 'task-005',
    title: 'Prepare visa support letters',
    description: 'Draft and approve template for visa invitation letters',
    workstream: 'Visas',
    assignee: 'Priya Sharma',
    assigneeAvatar: 'PS',
    dueDate: '2024-07-18',
    status: 'Not Started',
    priority: 'Medium',
    progress: 0,
    dependencies: ['task-002'],
    subtasks: [],
  },
  {
    id: 'task-006',
    title: 'Fleet procurement for shuttles',
    description: 'Finalize contracts with transportation vendors',
    workstream: 'Transportation',
    assignee: 'Ahmed Hassan',
    assigneeAvatar: 'AH',
    dueDate: '2024-08-01',
    status: 'In Progress',
    priority: 'Low',
    progress: 30,
    dependencies: [],
    subtasks: [],
  },
  {
    id: 'task-007',
    title: 'Badge design and zone mapping',
    description: 'Complete accreditation badge designs with security zones',
    workstream: 'Accreditation',
    assignee: 'Lisa Chen',
    assigneeAvatar: 'LC',
    dueDate: '2024-07-22',
    status: 'Completed',
    priority: 'High',
    progress: 100,
    dependencies: [],
    subtasks: [],
  },
  {
    id: 'task-008',
    title: 'Equipment customs clearance prep',
    description: 'Prepare documentation for equipment import/export',
    workstream: 'Equipment',
    assignee: 'Carlos Rodriguez',
    assigneeAvatar: 'CR',
    dueDate: '2024-08-05',
    status: 'Not Started',
    priority: 'Medium',
    progress: 0,
    dependencies: [],
    subtasks: [],
  },
];

const risks: Risk[] = [
  {
    id: 'risk-001',
    title: 'Airline partner withdrawal',
    description: 'Primary airline partner may reduce allocated seats due to peak season demand',
    workstream: 'Travel',
    level: 'High',
    impact: 'Could affect 30% of participant travel arrangements',
    mitigation: 'Negotiate backup agreements with secondary carriers',
    owner: 'Emma Wilson',
    status: 'Mitigating',
    createdAt: '2024-06-15',
  },
  {
    id: 'risk-002',
    title: 'Visa processing delays',
    description: 'Government processing times may exceed SLA due to holiday period',
    workstream: 'Visas',
    level: 'Medium',
    impact: 'Potential delayed arrivals for 15% of international guests',
    mitigation: 'Submit applications 2 weeks earlier than standard',
    owner: 'Priya Sharma',
    status: 'Open',
    createdAt: '2024-06-20',
  },
  {
    id: 'risk-003',
    title: 'Hotel overbooking',
    description: 'Partner hotel received conflicting event during same dates',
    workstream: 'Accommodation',
    level: 'Critical',
    impact: 'Loss of 200 reserved rooms',
    mitigation: 'Activated backup hotel agreements, reallocating VIPs',
    owner: 'David Kim',
    status: 'Mitigating',
    createdAt: '2024-07-01',
  },
  {
    id: 'risk-004',
    title: 'Badge printer availability',
    description: 'Specialized badge printers on backorder worldwide',
    workstream: 'Accreditation',
    level: 'Low',
    impact: 'May need to use alternative printing method',
    mitigation: 'Secured rental units from neighboring city',
    owner: 'Lisa Chen',
    status: 'Resolved',
    createdAt: '2024-06-10',
  },
];

const projectDocuments: ProjectDocument[] = [
  { id: 'doc-001', name: 'Event Master Plan 2024', type: 'Plan', workstream: 'General', uploadedBy: 'John Admin', uploadedAt: '2024-05-01', size: '2.4 MB', version: 'v3.2' },
  { id: 'doc-002', name: 'Airline Partnership RFP', type: 'RFP', workstream: 'Travel', uploadedBy: 'Emma Wilson', uploadedAt: '2024-06-15', size: '1.8 MB', version: 'v1.0' },
  { id: 'doc-003', name: 'Hotel Contract - Grand Hyatt', type: 'Contract', workstream: 'Accommodation', uploadedBy: 'David Kim', uploadedAt: '2024-06-20', size: '3.1 MB', version: 'v2.1' },
  { id: 'doc-004', name: 'Accreditation Guidelines', type: 'Manual', workstream: 'Accreditation', uploadedBy: 'Lisa Chen', uploadedAt: '2024-05-15', size: '856 KB', version: 'v1.5' },
  { id: 'doc-005', name: 'Transport Operations Manual', type: 'Manual', workstream: 'Transportation', uploadedBy: 'Ahmed Hassan', uploadedAt: '2024-06-01', size: '1.2 MB', version: 'v2.0' },
  { id: 'doc-006', name: 'Weekly Status Report W27', type: 'Report', workstream: 'General', uploadedBy: 'Sarah Chen', uploadedAt: '2024-07-05', size: '425 KB', version: 'v1.0' },
];

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'Completed':
    case 'Closed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'In Progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'At Risk':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'Not Started':
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const getStatusVariant = (status: TaskStatus): "default" | "destructive" | "error" | "info" | "neutral" | "pending" | "secondary" | "success" | "warning" => {
  switch (status) {
    case 'Completed':
    case 'Closed':
      return 'success';
    case 'In Progress':
      return 'info';
    case 'At Risk':
      return 'warning';
    case 'Not Started':
      return 'secondary';
    default:
      return 'default';
  }
};

const getRiskVariant = (level: RiskLevel): "default" | "destructive" | "error" | "info" | "neutral" | "pending" | "secondary" | "success" | "warning" => {
  switch (level) {
    case 'Critical':
      return 'error';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
      return 'secondary';
    default:
      return 'default';
  }
};

const ProjectsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');

  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Closed').length;
  const atRiskTasks = tasks.filter(t => t.status === 'At Risk').length;
  const overallProgress = Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length);
  const openRisks = risks.filter(r => r.status !== 'Resolved').length;

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.workstream.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesWorkstream = workstreamFilter === 'all' || task.workstream === workstreamFilter;
    return matchesSearch && matchesStatus && matchesWorkstream;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Management"
        description="Plan, track, and manage event preparation workstreams"
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input placeholder="Enter task title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the task..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Workstream</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select workstream" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Invitations">Invitations</SelectItem>
                        <SelectItem value="Registration">Registration</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Accommodation">Accommodation</SelectItem>
                        <SelectItem value="Visas">Visas</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Accreditation">Accreditation</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Crowd Management">Crowd Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarah">Sarah Chen</SelectItem>
                        <SelectItem value="mike">Mike Johnson</SelectItem>
                        <SelectItem value="emma">Emma Wilson</SelectItem>
                        <SelectItem value="david">David Kim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Task</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Overall Progress"
          value={`${overallProgress}%`}
          icon={FolderKanban}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Tasks Completed"
          value={`${completedTasks}/${tasks.length}`}
          icon={CheckCircle2}
        />
        <StatsCard
          title="At Risk Items"
          value={atRiskTasks}
          icon={AlertTriangle}
          trend={{ value: atRiskTasks, isPositive: false }}
        />
        <StatsCard
          title="Open Risks"
          value={openRisks}
          icon={Flag}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="workstreams">Workstreams</TabsTrigger>
          <TabsTrigger value="risks">Risks & Issues</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="At Risk">At Risk</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={workstreamFilter} onValueChange={setWorkstreamFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Workstream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workstreams</SelectItem>
                      <SelectItem value="Invitations">Invitations</SelectItem>
                      <SelectItem value="Registration">Registration</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Accommodation">Accommodation</SelectItem>
                      <SelectItem value="Visas">Visas</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Accreditation">Accreditation</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="shrink-0 mt-1">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-medium break-words">{task.title}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {task.workstream}
                          </Badge>
                          {task.priority === 'High' && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Avatar className="h-4 w-4 shrink-0">
                              <AvatarFallback className="text-[10px]">{task.assigneeAvatar}</AvatarFallback>
                            </Avatar>
                            <span>{task.assignee}</span>
                          </div>
                          {task.dependencies.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ArrowUpRight className="h-3 w-3 shrink-0" />
                              <span>{task.dependencies.length} dependencies</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4 pl-7 lg:pl-0">
                      <div className="w-full sm:w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1.5" />
                      </div>
                      <StatusBadge status={task.status} variant={getStatusVariant(task.status)} />
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workstreams Tab */}
        <TabsContent value="workstreams" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {['Invitations', 'Registration', 'Travel', 'Accommodation', 'Visas', 'Transportation', 'Accreditation', 'Equipment', 'Crowd Management'].map((ws) => {
              const wsTasks = tasks.filter(t => t.workstream === ws);
              const completed = wsTasks.filter(t => t.status === 'Completed' || t.status === 'Closed').length;
              const atRisk = wsTasks.filter(t => t.status === 'At Risk').length;
              const progress = wsTasks.length > 0 
                ? Math.round(wsTasks.reduce((acc, t) => acc + t.progress, 0) / wsTasks.length)
                : 0;

              return (
                <Card key={ws} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ws}</CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tasks</span>
                        <span>{completed}/{wsTasks.length} complete</span>
                      </div>
                      {atRisk > 0 && (
                        <div className="flex items-center gap-1 text-sm text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{atRisk} at risk</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risk Register</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Log Risk
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Log New Risk</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Risk Title</Label>
                        <Input placeholder="Enter risk title" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea placeholder="Describe the risk..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Workstream</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Accommodation">Accommodation</SelectItem>
                              <SelectItem value="Visas">Visas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Risk Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Impact</Label>
                        <Textarea placeholder="Describe potential impact..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Mitigation Plan</Label>
                        <Textarea placeholder="Describe mitigation strategy..." />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline">Cancel</Button>
                        <Button>Log Risk</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Workstream</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell>
                        <div className="min-w-[150px]">
                          <p className="font-medium">{risk.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {risk.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{risk.workstream}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={risk.level} variant={getRiskVariant(risk.level)} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {risk.impact}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{risk.owner}</TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={risk.status} 
                          variant={risk.status === 'Resolved' ? 'success' : risk.status === 'Mitigating' ? 'warning' : 'info'} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Documents</CardTitle>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Workstream</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectDocuments.map((doc) => (
                    <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{doc.workstream}</TableCell>
                      <TableCell className="whitespace-nowrap">{doc.uploadedBy}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{doc.size}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.version}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectsPage;
