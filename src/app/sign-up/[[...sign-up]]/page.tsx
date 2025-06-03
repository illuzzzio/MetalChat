
import { SignUp } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
       <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </CardContent>
      </Card>
    </div>
  );
}
