import { useState, useEffect } from 'react';
import { getUsers, updateUserRole, resetUserPassword } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import type { User } from '@/types';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'customer' | 'admin' | 'moderator' | 'superadmin') => {
    try {
      const updatedUser = await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: updatedUser.role } : u));
      toast.success('Role updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password to 0000?')) return;
    try {
      await resetUserPassword(userId);
      toast.success('Password reset to 0000 successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-6">Users</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-heading font-semibold">Full Name</th>
              <th className="text-left p-3 font-heading font-semibold">Username</th>
              <th className="text-left p-3 font-heading font-semibold">Role</th>
              <th className="text-left p-3 font-heading font-semibold">Joined</th>
              {isSuperAdmin && <th className="text-right p-3 font-heading font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium">{user.fullName || `${user.firstName} ${user.lastName}`.trim()}</td>
                <td className="p-3 font-mono text-xs text-primary">@{user.username || user.email?.split('@')[0]}</td>
                <td className="p-3">
                  {isSuperAdmin && user.id !== currentUser?.id ? (
                    <Select defaultValue={user.role} onValueChange={(val: any) => handleRoleChange(user.id, val)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={user.role === 'superadmin' ? 'destructive' : user.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {user.role}
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                {isSuperAdmin && (
                  <td className="p-3 text-right">
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user.id)}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Reset Pwd
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
