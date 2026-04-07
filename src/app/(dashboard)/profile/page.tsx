import { UserProfile } from "@clerk/nextjs";

export const metadata = { title: "Mon profil" };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
        <p className="mt-1 text-sm text-slate-500">Gérez votre compte et vos préférences</p>
      </div>
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-sm rounded-xl border border-slate-200",
          },
        }}
      />
    </div>
  );
}
