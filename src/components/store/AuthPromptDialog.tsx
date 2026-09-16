import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthPromptDialog({ open, onOpenChange, redirectUrl = '/checkout' }: { open: boolean; onOpenChange: (open: boolean) => void; redirectUrl?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Required</DialogTitle>
          <DialogDescription>
            You need to be signed in to complete your order. Your cart is already saved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Link to={`/login?redirect=${redirectUrl}&register=true`} onClick={() => onOpenChange(false)}>
            <Button className="w-full gradient-primary text-primary-foreground font-semibold">
              <UserPlus className="mr-2 h-4 w-4" /> Create an Account
            </Button>
          </Link>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Link to={`/login?redirect=${redirectUrl}`} onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full">
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
