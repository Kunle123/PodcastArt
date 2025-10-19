import { useUser, useClerk } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut, redirectToSignIn } = useClerk();
  const { redirectOnUnauthenticated = false } = options ?? {};

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const state = useMemo(() => {
    // Map Clerk user to our User type
    const user = clerkUser ? {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || 'User',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role: 'user' as const,
      subscriptionPlan: 'free' as const,
      subscriptionStatus: 'active',
      createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
      lastSignedIn: new Date(),
    } : null;

    // Store user info in localStorage for compatibility
    if (user) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(user)
      );
    }

    return {
      user,
      loading: !isLoaded,
      error: null,
      isAuthenticated: Boolean(isSignedIn && clerkUser),
    };
  }, [clerkUser, isLoaded, isSignedIn]);

  // Handle redirect on unauthenticated
  if (redirectOnUnauthenticated && isLoaded && !isSignedIn) {
    redirectToSignIn();
  }

  return {
    ...state,
    refresh: () => {
      // Clerk handles refresh automatically
      return Promise.resolve();
    },
    logout,
  };
}

