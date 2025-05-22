import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/sign-in')
  }
  
  const { data: user_ads } = await supabase.from('user_ads').select()


  return <pre>{JSON.stringify(user_ads, null, 2)}</pre>
}