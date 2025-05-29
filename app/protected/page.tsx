import Hero from "@/components/hero";
import ConnectSupabaseSteps from "@/components/tutorial/connect-supabase-steps";
import SignUpUserSteps from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import UserAdsSection from "@/components/user-ads-section";
import { SearchProvider } from "@/components/search-context";
import SearchAd from "@/components/search-ad";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <SearchProvider>
        <SearchAd />
        <UserAdsSection />
      </SearchProvider>
    </main>
  );
}