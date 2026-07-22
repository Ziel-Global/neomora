import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';

interface Manager {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  country?: string;
  organization?: string;
  federation?: string;
  status?: string;
  createdAt?: string;
}

const ManagerList: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from actual API endpoints
      const endpoints = ['/admin/managers', '/team-managers'];
      let fetchedData = null;
      
      for (const ep of endpoints) {
        try {
          const { data } = await apiClient.get(ep);
          fetchedData = Array.isArray(data) ? data : (data?.data || data?.managers || data?.users || []);
          if (fetchedData && Array.isArray(fetchedData) && fetchedData.length > 0) {
            break;
          }
        } catch (e) {
          // ignore and try next
        }
      }

      if (fetchedData && Array.isArray(fetchedData)) {
        setManagers(fetchedData);
      } else {
        // Fallback to mock data if API fails or returns nothing
        setManagers([
        
        ]);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load managers');
    } finally {
      setIsLoading(false);
    }
  };

  const getManagerName = (manager: Manager) => {
    if (manager.firstName && manager.lastName) {
      return `${manager.firstName} ${manager.lastName}`;
    }
    if (manager.firstName) return manager.firstName;
    if (manager.name) return manager.name;
    return 'Unknown';
  };

  const filteredManagers = managers.filter(manager => {
    const query = searchQuery.toLowerCase();
    const fullName = getManagerName(manager).toLowerCase();
    return (
      fullName.includes(query) ||
      (manager.email && manager.email.toLowerCase().includes(query)) ||
      (manager.country && manager.country.toLowerCase().includes(query)) ||
      (manager.organization && manager.organization.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHomeHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <PageHeader
          title="Team Managers"
          description="View and manage all team managers across the system."
        />

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manager List
              </CardTitle>
              <CardDescription>
                Overview of registered team managers
              </CardDescription>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search managers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Organization / Federation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading managers...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredManagers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No managers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredManagers.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell className="font-medium">
                          {getManagerName(manager)}
                        </TableCell>
                        <TableCell>{manager.email}</TableCell>
                        <TableCell>{manager.phone || '-'}</TableCell>
                        <TableCell>{manager.country || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{manager.organization || '-'}</span>
                            {manager.federation && (
                              <span className="text-xs text-muted-foreground">
                                {manager.federation}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={manager.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                            {manager.status || 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ManagerList;
