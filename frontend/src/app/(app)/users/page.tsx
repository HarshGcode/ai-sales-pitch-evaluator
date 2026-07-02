"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { TableSkeleton } from "@/components/layout/TableSkeleton";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import type { Role, User, UserCreateResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CREATABLE_ROLES: Record<Role, Role[]> = {
  admin: ["admin", "manager", "sales_exec"],
  manager: ["sales_exec"],
  sales_exec: [],
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<UserCreateResponse | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("sales_exec");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiGet<User[]>("/users");
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const allowedRoles = currentUser ? CREATABLE_ROLES[currentUser.role] : [];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiPost<UserCreateResponse>("/users", {
        email,
        full_name: fullName,
        role,
        department: department || undefined,
      });
      setCreatedCredentials(result);
      setEmail("");
      setFullName("");
      setDepartment("");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  }

  if (currentUser && currentUser.role === "sales_exec") {
    return <p className="text-muted-foreground text-sm">You don&apos;t have access to this page.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm">Manage managers and sales executives.</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setCreatedCredentials(null);
          }}
        >
          <DialogTrigger render={<Button>Invite user</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a new user</DialogTitle>
              <DialogDescription>
                They&apos;ll be created with a temporary password shown once below.
              </DialogDescription>
            </DialogHeader>
            {createdCredentials ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  <span className="font-medium">{createdCredentials.user.email}</span> was created.
                </p>
                <div className="bg-muted rounded-md p-3 font-mono text-sm">
                  {createdCredentials.initial_password}
                </div>
                <p className="text-muted-foreground text-xs">
                  Share this password securely. It won&apos;t be shown again.
                </p>
                <DialogFooter>
                  <Button onClick={() => setDialogOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite_email">Email</Label>
                  <Input
                    id="invite_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="department">Department (optional)</Label>
                  <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Inviting..." : "Invite"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                    <TableCell>{u.department ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "secondary" : "outline"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
