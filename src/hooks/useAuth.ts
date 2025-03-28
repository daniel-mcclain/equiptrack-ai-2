import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  isGlobalAdmin: boolean;
  selectedCompanyId: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    isGlobalAdmin: false,
    selectedCompanyId: null
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            userId: null,
            isGlobalAdmin: false,
            selectedCompanyId: null
          });
          return;
        }

        // Get user details including global admin status
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_global_admin, selected_company_id')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: session.user.id,
          isGlobalAdmin: userData?.is_global_admin || false,
          selectedCompanyId: userData?.selected_company_id || null
        });
      } catch (error) {
        console.error('Auth check error:', error);
        setState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          isGlobalAdmin: false,
          selectedCompanyId: null
        });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setState(prev => ({
        ...prev,
        isAuthenticated: !!session,
        userId: session?.user?.id || null,
        isLoading: false
      }));

      if (session?.user) {
        // Update global admin status when auth state changes
        supabase
          .from('users')
          .select('is_global_admin, selected_company_id')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setState(prev => ({
                ...prev,
                isGlobalAdmin: data.is_global_admin || false,
                selectedCompanyId: data.selected_company_id || null
              }));
            }
          })
          .catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchCompany = async (companyId: string) => {
    if (!state.isGlobalAdmin) return false;

    try {
      const { data, error } = await supabase
        .rpc('update_selected_company', { company_uuid: companyId });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        selectedCompanyId: companyId
      }));

      return true;
    } catch (error) {
      console.error('Error switching company:', error);
      return false;
    }
  };

  return { 
    ...state,
    switchCompany
  };
};