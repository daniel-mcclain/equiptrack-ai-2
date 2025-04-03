import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  isGlobalAdmin: boolean;
  selectedCompanyId: string | null;
  companyId: string | null; // For non-global admin users
  userRole: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    isGlobalAdmin: false,
    selectedCompanyId: null,
    companyId: null,
    userRole: null
  });
  
  // Track if user details have been fetched
  const [userDetailsFetched, setUserDetailsFetched] = useState(false);

  // Function to sync selectedCompanyId with companyId for non-global admins
  const syncCompanyId = useCallback((userData: any) => {
    console.log('syncCompanyId - userData:', userData);
    
    // For non-global admins, always use their assigned company
    if (userData && !userData.is_global_admin && userData.company_id) {
      console.log('Non-global admin user with company_id:', userData.company_id);
      return {
        isGlobalAdmin: false,
        selectedCompanyId: userData.company_id, // Set selectedCompanyId to match companyId
        companyId: userData.company_id,
        userRole: userData?.role || null
      };
    }
    
    // For global admins, use their selected company if available
    console.log('Global admin or missing company_id. is_global_admin:', 
      userData?.is_global_admin, 'selected_company_id:', userData?.selected_company_id);
    return {
      isGlobalAdmin: userData?.is_global_admin || false,
      selectedCompanyId: userData?.selected_company_id || null,
      companyId: userData?.company_id || null,
      userRole: userData?.role || null
    };
  }, []);

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
            selectedCompanyId: null,
            companyId: null,
            userRole: null
          });
          return;
        }

        console.log('Session found, fetching user details');
        
        // Get user details including global admin status and company ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_global_admin, selected_company_id, company_id, role')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user details:', userError);
          throw userError;
        }

        console.log('Raw user data from database:', userData);

        // Sync company IDs based on user type
        const userState = syncCompanyId(userData);
        console.log('checkAuth - userState after sync:', userState);

        console.log('User details fetched:', {
          userId: session.user.id,
          isGlobalAdmin: userState.isGlobalAdmin,
          selectedCompanyId: userState.selectedCompanyId,
          companyId: userState.companyId,
          userRole: userState.userRole
        });

        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: session.user.id,
          ...userState
        });
        
        // Mark user details as fetched
        setUserDetailsFetched(true);
      } catch (error) {
        console.error('Auth check error:', error);
        setState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          isGlobalAdmin: false,
          selectedCompanyId: null,
          companyId: null,
          userRole: null
        });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      // Update authentication state immediately
      setState(prev => ({
        ...prev,
        isAuthenticated: !!session,
        userId: session?.user?.id || null,
        isLoading: !!session && !userDetailsFetched // Only loading if we have a session but need to fetch details
      }));

      // Only fetch user details if we have a session and haven't fetched them yet
      // or if the auth state changed to signed_in (new login)
      if (session?.user && (event === 'SIGNED_IN' || !userDetailsFetched)) {
        console.log('Updating user status after auth change');
        // Update user details when auth state changes
        supabase
          .from('users')
          .select('is_global_admin, selected_company_id, company_id, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              console.log('User data after auth change:', data);
              // Sync company IDs based on user type
              const userState = syncCompanyId(data);
              
              console.log('Updated user status:', {
                isGlobalAdmin: userState.isGlobalAdmin,
                selectedCompanyId: userState.selectedCompanyId,
                companyId: userState.companyId,
                userRole: userState.userRole
              });
              
              setState(prev => ({
                ...prev,
                isLoading: false,
                ...userState
              }));
              
              // Mark user details as fetched
              setUserDetailsFetched(true);
            }
          })
          .catch(error => {
            console.error('Error updating user status:', error);
            setState(prev => ({
              ...prev,
              isLoading: false
            }));
          });
      } else if (event === 'SIGNED_OUT') {
        // Reset user details fetched flag on sign out
        setUserDetailsFetched(false);
        setState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          isGlobalAdmin: false,
          selectedCompanyId: null,
          companyId: null,
          userRole: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [userDetailsFetched, syncCompanyId]);

  const switchCompany = useCallback(async (companyId: string) => {
    console.log("switchCompany called with companyId:", companyId);
    console.log("Current state:", state);
    
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
  }, [state.isGlobalAdmin]);

  return { 
    ...state,
    switchCompany
  };
};