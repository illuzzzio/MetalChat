
import { SignIn } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        </CardContent>
      </Card>
    </div>
  );
}
