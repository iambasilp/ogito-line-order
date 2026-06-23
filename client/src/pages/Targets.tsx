import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target as TargetIcon, Calendar, Edit2, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface UserWithId {
  _id?: string;
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user' | 'driver';
}

interface TargetData {
  _id?: string;
  username: string;
  month: string;
  target: number;
}

const Targets: React.FC = () => {
  const [salesExecs, setSalesExecs] = useState<UserWithId[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  
  // Default to current month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  
  const [loading, setLoading] = useState(false);
  const [editingTargetFor, setEditingTargetFor] = useState<UserWithId | null>(null);
  const [newTargetAmount, setNewTargetAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSalesExecs();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchTargets(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchSalesExecs = async () => {
    try {
      const response = await api.get('/users/sales');
      setSalesExecs(response.data);
    } catch (error) {
      console.error('Failed to fetch sales execs:', error);
    }
  };

  const fetchTargets = async (month: string) => {
    setLoading(true);
    try {
      const response = await api.get('/targets', { params: { month } });
      const targetMap: Record<string, number> = {};
      response.data.forEach((t: TargetData) => {
        targetMap[t.username.toLowerCase()] = t.target;
      });
      setTargets(targetMap);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTarget = (exec: UserWithId) => {
    setEditingTargetFor(exec);
    const currentTarget = targets[exec.username.toLowerCase()] || 0;
    setNewTargetAmount(currentTarget.toString());
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTargetFor) return;

    const amount = Number(newTargetAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid target amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/targets', {
        username: editingTargetFor.username,
        month: selectedMonth,
        target: amount
      });
      
      triggerReward();
      setTargets(prev => ({
        ...prev,
        [editingTargetFor.username.toLowerCase()]: amount
      }));
      setEditingTargetFor(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save target');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-8 w-full max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <TargetIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Monthly Targets</h1>
              <p className="text-sm text-muted-foreground mt-1">Set and manage revenue goals for Sales Executives</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl border border-border">
            <Calendar className="h-5 w-5 text-muted-foreground ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="bg-transparent border-none focus:ring-0 text-sm font-semibold cursor-pointer outline-none"
            />
          </div>
        </div>

        <Card className="border-none shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Targets for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : salesExecs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p>No Sales Executives found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Executive</th>
                      <th className="px-6 py-4 font-semibold">Username</th>
                      <th className="px-6 py-4 font-semibold text-right">Target Amount</th>
                      <th className="px-6 py-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesExecs.map((exec) => {
                      const currentTarget = targets[exec.username.toLowerCase()] || 0;
                      const hasTarget = currentTarget > 0;
                      return (
                        <tr key={exec.id || exec._id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">
                            {exec.name || exec.username}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            @{exec.username}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {hasTarget ? (
                              <span className="font-bold text-base font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(currentTarget)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic px-3 py-1 bg-muted rounded-full text-xs font-medium">
                                Not Set
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTarget(exec)}
                              className="font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              {hasTarget ? 'Edit Target' : 'Set Target'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Target Modal */}
        <Dialog open={!!editingTargetFor} onOpenChange={(open) => !open && setEditingTargetFor(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TargetIcon className="h-5 w-5 text-primary" />
                Set Target for {editingTargetFor?.name || editingTargetFor?.username}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveTarget} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount" className="text-muted-foreground">
                  Target Amount for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (₹)
                </Label>
                <Input
                  id="targetAmount"
                  type="number"
                  min="0"
                  step="1000"
                  value={newTargetAmount}
                  onChange={(e) => setNewTargetAmount(e.target.value)}
                  placeholder="e.g. 5000000"
                  required
                  autoFocus
                  className="text-lg font-mono"
                />
                {newTargetAmount && Number(newTargetAmount) > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Will be saved as {formatCurrency(Number(newTargetAmount))}
                  </p>
                )}
              </div>
              <div className="pt-4 border-t border-border mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTargetFor(null)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Target'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Targets;
