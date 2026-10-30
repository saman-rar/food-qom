"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useAuth(requireAuth = true, allowedRoles?: string[]) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/login")
    }
    if (requireAuth && session && allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push("/dashboard")
    }
  }, [session, status, router, requireAuth, allowedRoles])

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  }
}

export function useUser() {
  const { data: session } = useSession()
  return session?.user
}