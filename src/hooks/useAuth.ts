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
        console.log('Checking authentication status...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active session found');
          setState({
            isAuthenticated: false,
            isLoading: false,
            userId: null,
            isGlobalAdmin: false,
            selectedCompanyId: null
          });
          return;
        }

        console.log('Session found, fetching user details');
        // Get user details including global admin status
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_global_admin, selected_company_id')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user details:', userError);
          throw userError;
        }

        console.log('User details fetched:', {
          userId: session.user.id,
          isGlobalAdmin: userData?.is_global_admin,
          selectedCompanyId: userData?.selected_company_id
        });

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
      console.log('Auth state changed:', event);
      setState(prev => ({
        ...prev,
        isAuthenticated: !!session,
        userId: session?.user?.id || null,
        isLoading: false
      }));

      if (session?.user) {
        console.log('Updating user status after auth change');
        // Update global admin status when auth state changes
        supabase
          .from('users')
          .select('is_global_admin, selected_company_id')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              console.log('Updated user status:', {
                isGlobalAdmin: data.is_global_admin,
                selectedCompanyId: data.selected_company_id
              });
              setState(prev => ({
                ...prev,
                isGlobalAdmin: data.is_global_admin || false,
                selectedCompanyId: data.selected_company_id || null
              }));
            }
          })
          .catch(error => {
            console.error('Error updating user status:', error);
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchCompany = async (companyId: string) => {
    console.log("switchCompany called with companyId:", companyId);
    
    if (!state.isGlobalAdmin) {
      console.log("User is not a global admin, cannot switch company");
      return false;
    }

    try {
      console.log("Updating selected company...");
      const { data, error } = await supabase
        .rpc('update_selected_company', { company_uuid: companyId });

      if (error) {
        console.error("Error updating selected company:", error);
        throw error;
      }

      console.log("Selected company updated successfully");
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