"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-white">
              Orbis AI
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-zinc-800/50 border-zinc-700 text-white hover:bg-zinc-800 hover:border-[#e78a53]/50"
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-zinc-400 mb-8">Here&apos;s your dashboard overview</p>

          {/* User Info Card */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Full Name</p>
                <p className="text-white font-medium">{user.full_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Email</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Role</p>
                <p className="text-white font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Member Since</p>
                <p className="text-white font-medium">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 hover:border-[#e78a53]/50 transition-colors cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Plan a Trip</h3>
              <p className="text-zinc-400 text-sm">Start planning your next adventure with AI assistance</p>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 hover:border-[#e78a53]/50 transition-colors cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">My Trips</h3>
              <p className="text-zinc-400 text-sm">View and manage your saved travel plans</p>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 hover:border-[#e78a53]/50 transition-colors cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
              <p className="text-zinc-400 text-sm">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
